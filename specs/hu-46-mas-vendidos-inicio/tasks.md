# Tareas: HU-46 — Platos más vendidos en la página de inicio (bento)

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] Consultas en `ProductRepository` (más vendidos de 30 días pedibles y relleno por calificación y antigüedad) y `CatalogService.featured()` con `FeaturedProductResponse` — cubre: qué platos aparecen, orden, etiqueta, relleno, solo pedibles, mínimo de 3 — verificación: `FeaturedProductsIT` (paquete de test `pedidos`, para crear pedidos reales con `OrderITSupport`) — con 2 platos vendidos, los 2 van primero con `bestSeller` y en orden de unidades, y 3 de relleno sin la etiqueta, en orden de calificación y luego de antigüedad; un plato vendido pero agotado, no disponible o inactivo no aparece; un pedido `PENDIENTE_PAGO`, `PENDIENTE_COBRO`, `CANCELADO` o pagado hace 31 días no cuenta; nunca hay más de 5; con menos de 3 platos pedibles devuelve `[]`.
- [x] `GET /api/products/featured` en `CatalogController` — cubre: acceso público — verificación: el mismo IT — responde `200` sin sesión y no choca con `/api/products/{id}`.

## Frontend

- [x] `getFeaturedProducts` y `use-featured-products.ts` — cubre: datos de la sección — verificación: tests del componente con la API simulada.
- [x] `components/featured-bento.tsx` y su lugar en `home-page.tsx` — cubre: título, 5 casillas con la grande primero, foto, nombre, precio, etiqueta "Más vendido" solo en vendidos, enlace al detalle, "Agregar" al carrito, "Ver toda la carta", carga sin saltos, sin sección si falla o está vacía — verificación: `tests/features/home/components/featured-bento.test.tsx`.

## Documentación

- [x] `frontend/src/features/home/README.md` con la sección de favoritos — cubre: impacto en documentación — verificación: revisión del `.md`.

## Verificación en navegador y cierre

- [x] Revisar `/` con la semilla `dev`: hoy 2 vendidos con etiqueta y 3 de relleno; agotar uno de los vendidos desde el panel y ver que sale; agregar al carrito desde una casilla; revisar la grilla en celular y escritorio — cubre: criterios de qué platos aparecen, cada casilla y adaptación.
- [x] Repasar cada criterio de `spec.md`, correr `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm lint`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
