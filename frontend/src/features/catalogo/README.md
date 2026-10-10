Catálogo de productos — épica [E2](../../../../docs/epicas.md#e2) (HU-07 a HU-11).

- `catalog-page.tsx`: pantalla `/:category` (categorías a la izquierda, grilla paginada de 18 en 18; la página va en `?page=`).
- `home-redirect.tsx`: `/` redirige a la primera categoría.
- `catalog-api.ts` / `use-catalog-queries.ts`: `GET /api/categories` y `GET /api/products?category=&page=`.
- `components/`: `category-list`, `product-card`, `product-grid`.
