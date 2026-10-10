# Tareas: HU-08 — Ver el detalle de un plato

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] Agregar `ProductRepository.findByIdAndActiveTrue` y `ProductNotFoundException` mapeada a `404` en `ApiExceptionHandler` — cubre: plato inexistente o inactivo, no revelar si existe — verificación: `CatalogControllerIT` (`detailOfInactiveAndMissingProductsRespondTheSame404`) — inactivo e inexistente responden `404` con el mismo mensaje; el filtro `active` va en la consulta.
- [x] Crear `dto/ProductDetailResponse` e implementar `CatalogService.getProduct(id)` — cubre: datos del detalle, varias imágenes ordenadas, una imagen, sin imágenes, sin calificación — verificación: `CatalogServiceTest` — `images` va ordenado por `position` con la URL completa; plato sin imágenes devuelve `[]`; `rating` nulo se conserva; plato inactivo o inexistente lanza `ProductNotFoundException`.
- [x] Agregar `GET /api/products/{id}` a `CatalogController` — cubre: detalle público, plato inactivo/inexistente, `id` no numérico — verificación: `CatalogControllerIT` — `200` sin sesión con el JSON esperado; `404` para inactivo e inexistente con el mismo cuerpo; `400` para `abc`.
- [x] Revisar `R__sample_products.sql` y agregar, si falta, un plato con 3 imágenes y uno con una sola — cubre: probar galería y miniaturas en local — verificación: correr dos veces con perfil `dev` no duplica filas.

## Frontend

- [x] Agregar `ProductDetail`, `getProduct` y `useProduct` (con `placeholderData` desde la caché del listado) — cubre: detalle sin esperar a la red, imagen sin salto — verificación: `tests/features/catalogo/product-detail-page.test.tsx` — el detalle se pinta con los datos de `getProduct`; el placeholder desde la caché del listado se comprueba en navegador junto con la transición.
- [x] Hacer tocable `ProductCard` (`Link` con `viewTransition`, nombres de transición solo en la tarjeta en transición) — cubre: clic en cualquier parte de la tarjeta, elemento compartido único, teclado — verificación: `tests/features/catalogo/components/product-card.test.tsx` — el enlace apunta a `/products/{id}`, se activa con Enter y ninguna tarjeta tiene `view-transition-name` fuera de una navegación.
- [x] Crear `ProductGallery` (imagen principal, miniaturas, reemplazo) — cubre: varias imágenes, una sola, sin imágenes, imagen que falla — verificación: `tests/features/catalogo/components/product-gallery.test.tsx` — con 1 imagen no hay miniaturas; clic en miniatura cambia la principal; sin imágenes o con `onError` se ve la imagen de reemplazo.
- [x] Crear `ProductDetailPage` y registrar `/products/:id` en `router.tsx` — cubre: contenido del detalle, "Volver", plato inexistente, `id` inválido, error de red, foco en el `h1`, acceso público — verificación: `tests/features/catalogo/product-detail-page.test.tsx` — muestra imagen, nombre, categoría, precio `S/ 32.00`, calificación (ausente si es `null`) y descripción; `404` e `id` inválido muestran "No encontramos este plato" (el segundo sin petición); "Volver" va a `location.state.from` o a `/{slug}`.
- [x] Agregar los estilos de la transición (duración, curva y `prefers-reduced-motion`) — cubre: animación ~300 ms, movimiento reducido — verificación: revisión en navegador (jsdom no ejecuta view transitions).

## Verificación en navegador y cierre

- [ ] Recorrer en navegador con soporte: clic en tarjeta → la imagen viaja al detalle; "Volver" → regresa a la misma tarjeta con página y orden conservados; atrás del navegador (ver riesgo en `plan.md`; si no anima, actualizar `spec.md`) — cubre: criterios de la view transition.
- [ ] Recorrer sin animación: movimiento reducido activado y navegador sin soporte (o `document.startViewTransition = undefined` desde la consola) navegan normal; acceso directo y recarga en `/products/{id}` sin animación — cubre: degradación.
- [ ] Probar `/products/abc`, `/products/999999` y el detalle de un plato inactivo — cubre: casos borde de plato inexistente.
- [ ] Repasar cada criterio de `spec.md`, correr `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
