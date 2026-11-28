# Plan: HU-46 — Platos más vendidos en la página de inicio (bento)

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

### Endpoint (público, paquete `catalogo`)

| Método | Ruta                     | Response                                   |
| ------ | ------------------------ | ------------------------------------------ |
| GET    | `/api/products/featured` | `FeaturedProductResponse[]` (0 o hasta 5)  |

- `FeaturedProductResponse`: los campos de `ProductResponse` (`id`, `name`, `description`, `price`, `rating`, `imageUrl`, `available`, `stock`) más `bestSeller` (boolean). Se arma con el mismo `toResponse` de `CatalogService`.
- La ruta `/api/products/featured` va antes que `/api/products/{id}` en el mapeo (Spring prioriza la ruta literal); queda pública como el resto de `GET /api/products/**`, sin cambios de seguridad.

### Armado de la grilla (`CatalogService.featured()`)

1. **Más vendidos**: consulta nativa en `ProductRepository` sobre `order_items` + `orders`: `SUM(quantity)` y `SUM(line_total)` por `product_id`, solo pedidos `PAGADO` con `paid_at` en los últimos 30 días (la regla del reporte de ventas; un contraentrega recibe `paid_at` al entregarse), ordenados por unidades, ingresos y nombre del plato (`products.name`). Se une con `products` para quedarse solo con platos **pedibles**: activos, no eliminados, disponibles y con stock (`is_active`, `deleted_at IS NULL`, `is_available`, `stock > 0`), con `LIMIT 5`.
2. **Relleno**: si faltan, platos pedibles que no estén ya en la lista, ordenados por `rating DESC NULLS LAST`, luego `created_at DESC` y `id DESC` (los mejor calificados primero y, entre los sin calificación, los más recientes), con el `LIMIT` de las casillas que faltan.
3. **Mínimo**: si en la carta hay menos de 3 platos pedibles, devuelve una lista vacía (la sección no se muestra).
- Constantes en el servicio: `FEATURED_SLOTS = 5`, `FEATURED_MIN = 3`, `BEST_SELLER_WINDOW = 30 días`.
- **Índices**: sin migración. La consulta filtra con el índice parcial `idx_orders_report_paid` (`paid_at` de los pedidos `PAGADO`, V18) y une por `idx_order_items_order_id`; con el volumen de pedidos de 30 días basta.
- **Caché**: ninguna, como el resto del catálogo. Si la portada se vuelve costosa, Redis (lecturas frecuentes del catálogo) es el lugar indicado.

## Frontend

- `features/catalogo/catalog-api.ts`: tipo `FeaturedProduct` (`Product` + `bestSeller`) y `getFeaturedProducts()`.
- `features/home/use-featured-products.ts` (nuevo): `useQuery` con clave `['catalog', 'featured']`, bajo `['catalog']` para que lo invaliden los cambios del catálogo del panel (como ya se hace con categorías y platos).
- `features/home/components/featured-bento.tsx` (nuevo):
  - `<section aria-labelledby>` debajo del hero, dentro del ancho del sitio (`max-w-6xl`, `px-6`), con el título `h2` "Los favoritos de la casa" (`font-display text-title-lg`) y el enlace "Ver toda la carta" a `/menu`.
  - Grilla `grid grid-cols-2 gap-4 lg:grid-cols-4 lg:grid-rows-2`; la primera casilla `col-span-2 lg:row-span-2` (en celular queda arriba a todo el ancho, en escritorio a la izquierda ocupando dos filas).
  - Cada casilla: `Card` con la foto (`DishImage`, con la imagen de respaldo de la carta), la etiqueta "Más vendido" (insignia `text-caption`, como las de la tabla de cupones) solo si `bestSeller`, el nombre (enlace al detalle, con el área clicable extendida a la foto), el precio (`formatPrice`) y `AddToCartButton` con la etiqueta "Agregar". El botón es hermano del enlace, no hijo, igual que en `ProductCard`.
  - Carga: cinco casillas de esqueleto con la misma grilla (sin saltos). Error o lista vacía: no se renderiza la sección.
- `features/home/home-page.tsx`: agrega `FeaturedBento` debajo de `HomeHero`.
- **Design system**: `Card`, `Button` (vía `AddToCartButton`), utilities de la escala tipográfica y colores existentes.

## Decisiones

- **Endpoint propio** en lugar de reutilizar el reporte de ventas: el reporte es del panel, agrupa por nombre del plato y tiene sus filtros; la portada necesita `product_id`, solo platos pedibles y el relleno.
- **Relleno en el servidor**: el cliente recibe la grilla lista y no necesita una segunda llamada ni conocer las reglas.
- **Componente de casilla propio** en vez de `ProductCard`: la casilla grande tiene otra proporción y la etiqueta "Más vendido"; se reutilizan `DishImage`, `AddToCartButton` y `formatPrice`.

## Impacto en docs/

- `docs/historias.md`, `docs/epicas.md` y `docs/cronograma.md`: ya registran HU-46 (Sprint 3, semana 3).
- `docs/diagrama-de-arquitectura.md`: sin cambios (mismo paquete y capas).
- `frontend/src/features/home/README.md`: la sección de favoritos y su regla de relleno.
