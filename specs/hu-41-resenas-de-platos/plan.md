# Plan: HU-41 — Reseñas de platos

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

- **Endpoints** (paquete `catalogo`, junto a `CatalogController`):
  - `GET /api/products/{id}/reviews?page=1&filter=` (público; `filter` = `positive` (4-5), `neutral` (3) o `negative` (1-2); otro valor o ausente = todas): `{ items: [{ id, authorName, rating, comment, createdAt, edited }], page, totalPages, total }`, 10 por página, `created_at DESC, id DESC`. Plato inexistente o inactivo: 404 (`ProductNotFoundException`, igual que el detalle).
  - `GET /api/products/{id}/reviews/mine` (CLIENTE): `{ canReview, review }`, donde `review` es la reseña propia o `null`. `canReview` es verdadero si hay un pedido propio `ENTREGADO` con el plato.
  - `PUT /api/products/{id}/reviews/mine` (CLIENTE): body `{ rating (1-5), comment (opcional, hasta 500) }`. Crea o edita (una por cliente y plato); responde la reseña. 403 si no compró.
  - `DELETE /api/products/{id}/reviews/mine` (CLIENTE): 204; 404 si no tiene reseña.
  - `ProductDetailResponse.rating` ya existe; ahora sale del promedio. `ProductDetailResponse` agrega `reviewCount` para el resumen.
- **Capas**:
  - Seguridad: las rutas `.../reviews` GET son públicas; `.../reviews/mine` exige rol `CLIENTE` (ajustar `SecurityConfig`).
  - Entidad `Review` y `ReviewRepository` (Spring Data JPA); `ReviewService` con la regla de compra, el upsert y el recálculo del promedio; `ReviewController`.
  - Regla de compra: consulta en `OrderRepository` (existe un `order_items` del plato en un pedido del usuario con `delivery_status = 'ENTREGADO'`).
  - Excepción nueva `ReviewNotAllowedException` (403) y `ReviewNotFoundException` (404) en `common/exception`, mapeadas en `ApiExceptionHandler`.
- **Base de datos**: migración `V17__product_reviews.sql`:
  - Tabla `product_reviews` (`id`, `product_id` FK, `user_id` FK, `rating SMALLINT CHECK 1..5`, `comment VARCHAR(500)` nullable, `created_at`, `updated_at`), `UNIQUE (product_id, user_id)` e índice `(product_id, created_at DESC, id DESC)`.
  - `ON DELETE CASCADE` desde `users` no aplica: si el usuario se elimina se conserva la reseña con autor "Cliente" (`user_id` nullable con `ON DELETE SET NULL`; la unicidad no afecta a los `NULL`).
  - Sin backfill: los `rating` de los datos de ejemplo de desarrollo se conservan hasta la primera reseña del plato, que los reemplaza por el promedio real.

## Frontend

- **Pantalla**: sección "Reseñas" al final de `product-detail-page.tsx`.
- **Componentes** (`src/features/catalogo/components/`): `reviews-section.tsx` (resumen y estados), `review-form.tsx` (estrellas + texto, `react-hook-form` + `zod`, dentro de un `Dialog` abierto por el botón "Escribir reseña"), `review-filters.tsx` (Todas, Positivas, Neutras, Negativas) y `review-list.tsx` (lista con scroll infinito), `review-item.tsx`, `star-rating-input.tsx` (selector accesible, `radiogroup`). Se reutiliza `star-icon.tsx`.
- **Datos**: `catalog-api.ts` y `use-catalog-queries.ts`: `useInfiniteQuery` para la lista (`['reviews', productId]`) y consulta de `mine`; las mutaciones invalidan la lista, `mine` y el detalle del plato (`rating` y `reviewCount`).
- **Scroll infinito**: un elemento centinela con `IntersectionObserver` que pide la siguiente página; con "Reintentar" ante error. Descarta duplicados por `id` al unir páginas.
- **Componentes del design system**: `Card`, `Input` (textarea con contador), `Button`, `Dialog` (confirmar eliminar) y `Notification` para errores.

## Seguridad

- El servidor valida siempre la compra (`ENTREGADO`) y toma el usuario de la sesión: la ruta usa `mine`, nunca un `userId` del cliente, así no se puede tocar una reseña ajena.
- Comentario como texto plano: se escapa por defecto en React; no se usa `dangerouslySetInnerHTML`. Se recorta (`trim`) y se valida el largo en el servidor.
- Respuestas públicas sin correo ni apellido: solo `authorName` (primer nombre).
- Límite de escritura razonable (una reseña por plato, 500 caracteres); sin rate limiting específico en esta historia.

## Decisiones

- **Un `PUT` upsert en `mine`** en vez de `POST`/`PUT` con `id`: refleja la regla "una reseña por cliente y plato" y evita duplicados por doble envío.
- **Paginación por `page`** con deduplicación en cliente en vez de cursor: más simple y el riesgo de repetir una reseña es menor y se cubre.
- **Promedio recalculado en la misma transacción** (`AVG` sobre `product_reviews` y `UPDATE products.rating`), con un bloqueo de fila del plato para que dos reseñas simultáneas no dejen un valor viejo; se mantiene la columna `rating` para no cambiar el catálogo y el orden por calificación.
- **Paquete `catalogo`**: las reseñas pertenecen al catálogo (E2) y se muestran en su detalle; solo consultan `pedidos` para la regla de compra.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: tabla `product_reviews` y que `products.rating` pasa a ser derivado (migración `V17`).
- `docs/diagrama-de-casos-de-uso.md`: agregar "Reseñar plato" (HU-41) al Cliente.
- `docs/cronograma.md`: incluir HU-41 si el cronograma lista las historias.
- `frontend/src/features/catalogo/README.md`: la sección de reseñas.
