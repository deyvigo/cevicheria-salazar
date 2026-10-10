# Plan: HU-08 — Ver el detalle de un plato

`spec.md` en estado Clarificada.

## Backend

### Endpoint (paquete `catalogo`, público y de solo lectura)

- **`GET /api/products/{id}`**: detalle de un plato activo.
  ```json
  {
    "id": 7,
    "name": "Ceviche clásico",
    "description": "...",
    "price": 32.00,
    "rating": 4.5,
    "category": { "id": 2, "name": "Ceviches", "slug": "ceviches" },
    "images": [
      "https://media.cevicheria-salazar.com/platos/ceviche-clasico-1.jpg",
      "https://media.cevicheria-salazar.com/platos/ceviche-clasico-2.jpg"
    ]
  }
  ```
  - `images` va ordenado por `position` (la primera es la principal); `[]` si el plato no tiene imágenes. `rating` es `null` si no tiene calificación.
  - Plato inexistente o con `is_active = false`: `404` con el mismo cuerpo de error en ambos casos, para no revelar que existe.
  - `id` no numérico: `400` por el conversor de Spring; el frontend no llega a pedirlo (ver Frontend).

### Capas

- **`ProductRepository.findByIdAndActiveTrue(Long id)`**: el filtro por `active` va en la consulta, no en el servicio.
- **`CatalogService.getProduct(Long id)`** (`@Transactional(readOnly = true)`: `open-in-view` es `false` y `images` y `category` son lazy). Lanza `ProductNotFoundException` si no hay resultado. Reutiliza `ImageUrlResolver` para cada imagen.
- **`ProductNotFoundException`** en `common/exception`, mapeada a `404` en `ApiExceptionHandler` con el formato de `ApiError` existente.
- **`dto/ProductDetailResponse`** (record con `from(...)`, como los demás DTO): `id`, `name`, `description`, `price`, `rating`, `category` (`CategoryResponse`), `images` (`List<String>`). `ProductResponse` del listado no cambia.
- **`CatalogController`**: agrega `@GetMapping("/products/{id}")`. Sin cambios de seguridad: `SecurityConfig` ya permite todo `GET`.

### Base de datos

Sin migraciones ni cambios de modelo. Los datos de ejemplo de dev (`R__sample_products.sql`) ya tienen platos con varias imágenes, con una sola, sin imágenes e inactivos; si falta alguno de esos casos se agrega ahí (idempotente).

## Frontend

### Ruta

- **`/products/:id`** → `ProductDetailPage` (`features/catalogo/product-detail-page.tsx`), hija de `Layout` en `router.tsx`. Sin conflicto con `/:category` (dos segmentos).
- `id` se valida como entero positivo antes de llamar a la API; si no lo es, se muestra "No encontramos este plato" sin petición.

### Archivos (`src/features/catalogo/`)

- `catalog-api.ts`: tipo `ProductDetail` y `getProduct(id)`.
- `use-catalog-queries.ts`: `useProduct(id)` con clave `['catalog', 'product', id]`. `placeholderData` toma el plato de las consultas de listado ya en caché (`queryClient.getQueriesData(['catalog', 'products'])`) y lo adapta a `ProductDetail` (`images: [imageUrl]`, sin `category`). Así el detalle pinta imagen, nombre, precio y calificación en el primer render, sin esperar a la red.
- `components/product-card.tsx`: la tarjeta pasa a ser un `<Link to="/products/{id}" viewTransition>` que envuelve el `Card`. Con `useViewTransitionState(to)` asigna `view-transition-name` (`product-image`, `product-name`, `product-price`) solo a la tarjeta que está en transición, para que nunca haya dos nombres repetidos en la grilla. Foco visible con el token de focus del design system.
- `components/product-gallery.tsx`: imagen principal + miniaturas (no se muestran si hay una sola imagen). Imagen de reemplazo si no hay imágenes o falla la carga (misma lógica de `onError` que la tarjeta; se extrae a un componente `DishImage` compartido si queda duplicada). La imagen principal lleva `view-transition-name: product-image` cuando `useViewTransitionState('/products/{id}')` es `true`; cambiar de miniatura no toca el nombre ni dispara transición.
- `product-detail-page.tsx`: layout de dos columnas (galería / info), enlace "Volver", categoría, nombre (`h1`, recibe el foco al montar), calificación, precio y descripción con `whitespace-pre-line`. Estados: cargando (esqueleto), error de red ("No pudimos cargar el plato. Intenta de nuevo."), `404` o `id` inválido ("No encontramos este plato" con enlace al catálogo).
- **"Volver"**: `<Link viewTransition>` a la URL del catálogo de la que vino (la tarjeta la guarda en `location.state.from`, con `?page` y `?sort`); sin `state` (acceso directo) va a `/{category.slug}`. Mientras llega la respuesta y no hay `category`, el enlace apunta a `/`.

### Estilos de la transición (`src/styles/`)

- Regla global con `::view-transition-group(*)` y `::view-transition-old/new(root)` con `animation-duration: 300ms` y `ease-out`, y un bloque `@media (prefers-reduced-motion: reduce)` que fija `animation: none` en los pseudoelementos `::view-transition-*`.
- Los nombres de transición son estáticos (`product-image`, `product-name`, `product-price`), no dependen del `id`.
- Sin soporte de `document.startViewTransition`, React Router navega con normalidad; no se agrega polyfill ni detección propia.

### Componentes del design system

`Card` (ya usado en la tarjeta). El detalle no necesita `Button` en esta historia; el espacio bajo el precio queda libre para HU-12/HU-10.

## Riesgos y cosas a verificar en navegador

- **Atrás del navegador**: React Router (`startNavigation`, rama `POP`) recuerda los pares de rutas que ya navegaron con `viewTransition` y reaplica la transición al ir atrás o adelante; por el código debería animar. Falta comprobarlo en navegador; si no anima, el criterio de `spec.md` se ajusta a "Volver" (enlace) con animación y atrás sin ella.
- **Pruebas con `useViewTransitionState`**: exige `RouterProvider` (router de datos); los tests de componentes que renderizan `ProductCard` usan `createMemoryRouter`, no `MemoryRouter`.
- **Posición de scroll al volver**: si la tarjeta de origen queda fuera de pantalla, la animación de regreso degrada al cruce de opacidad (ya previsto en la spec). Si se ve mal, se evalúa restaurar el scroll.
- **Nombre y precio**: si el cambio de tamaño entre tarjeta y detalle se ve deforme, se deja solo la imagen como elemento compartido (decisión de clarificación).

## Seguridad

- Endpoint público y de solo lectura; el filtro `is_active = true` está en la consulta (no en el frontend) y plato inactivo e inexistente responden igual.
- `id` va como parámetro enlazado de JPA; no hay entrada libre.
- Las URLs de imagen se arman en el servidor (`ImageUrlResolver`); el frontend no construye rutas de almacenamiento.
- `description` se renderiza como texto (React la escapa); nunca con `dangerouslySetInnerHTML`.

## Decisiones

- **Endpoint aparte en vez de ampliar el listado**: el listado se queda liviano (una imagen por plato); el detalle trae todas las imágenes y la categoría solo cuando se necesitan.
- **`404` en vez de `200` vacío** (a diferencia del listado de HU-07): aquí el recurso es un solo plato y el frontend necesita distinguir "no existe" de "cargó".
- **Nombres de transición estáticos + `useViewTransitionState`**: es el mecanismo de React Router para que solo el elemento clicado tenga el nombre; evita nombres por `id` y colisiones en la grilla.
- **Sin caché Redis**: igual que HU-07, no hay invalidación hasta HU-29.
- **Sin cambios en `docs/`**: no cambia arquitectura, despliegue ni modelo de datos.
