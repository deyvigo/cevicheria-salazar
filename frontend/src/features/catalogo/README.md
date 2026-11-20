Catálogo de productos — épica [E2](../../../../docs/epicas.md#e2) (HU-07 a HU-11, HU-41).

- `catalog-page.tsx`: pantalla `/menu` y `/menu/:category` (categorías a la izquierda, grilla paginada de 18 en 18; la página va en `?page=`).
- `catalog-api.ts` / `use-catalog-queries.ts`: `GET /api/categories` y `GET /api/products?category=&page=`.
- `components/`: `category-list`, `product-card`, `product-grid`.
- `components/reviews-section` (HU-41): reseñas al final de `/products/:id`. Resumen, botón "Escribir reseña" que abre un `Dialog` con el formulario, reseña propia (editar en el mismo diálogo, eliminar con confirmación) y `review-filters` (positivas 4-5, neutras 3, negativas 1-2) y `review-list` con scroll infinito de 10 en 10 (`IntersectionObserver`). `use-reviews.ts`: `GET /api/products/{id}/reviews?page=` y `GET/PUT/DELETE .../reviews/mine`. Quien no compró el plato (pedido `ENTREGADO`) no ve el formulario.
