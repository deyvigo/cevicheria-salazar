# Tareas: HU-10 — Saber si un plato está agotado o no disponible

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] Crear `V3__product_availability.sql` con `is_available BOOLEAN NOT NULL DEFAULT true` y actualizar `docs/diagrama-de-base-de-datos.md` — cubre: modelo de datos, platos existentes disponibles — verificación: `CatalogSchemaIT` — la migración corre; un plato insertado sin indicar la columna queda con `is_available = true`; la columna no acepta `NULL`.
- [x] Agregar `available` y `markUnavailable()` a `Product` — cubre: modelo de datos — verificación: `ddl-auto: validate` arranca sin errores (cualquier `*IT`).
- [x] Agregar `available` a `ProductDetailResponse` y llenarlo en `CatalogService.getProduct` — cubre: indicador verde y rojo, plato agotado visible con todos sus datos — verificación: `CatalogServiceTest` — un plato disponible devuelve `true`; uno con `markUnavailable()` devuelve `false` y conserva nombre, precio, imágenes y descripción.
- [x] Probar el endpoint de detalle y el listado con un plato agotado — cubre: agotado no es inactivo, público — verificación: `CatalogControllerIT` — `GET /api/products/{id}` de un plato agotado responde `200` con `available = false` sin sesión; el mismo plato sigue apareciendo y contando en `GET /api/products?category=`.
- [x] Marcar 3 platos como agotados en `R__sample_products.sql` — cubre: verlo en local — verificación: correr dos veces con perfil `dev` deja el mismo estado y no duplica filas.

## Frontend

- [x] Agregar `available: boolean | null` a `ProductDetail` y a la construcción del placeholder en `useProduct` — cubre: sin estado provisional — verificación: `tests/features/catalogo/product-detail-page.test.tsx` — con datos del listado en caché y la respuesta pendiente, no se muestra "Disponible" ni "Agotado".
- [x] Crear `AvailabilityBadge` — cubre: indicador verde "Disponible", indicador rojo "Agotado", espacio reservado, punto decorativo — verificación: `tests/features/catalogo/components/availability-badge.test.tsx` — `true` muestra "Disponible", `false` muestra "Agotado", `null` no muestra texto; el punto tiene `aria-hidden` y colores distintos para disponible y agotado.
- [x] Montar el indicador en `ProductDetailPage` en la fila de la categoría, a la derecha — cubre: ubicación, plato agotado con todos sus datos, estado actual al recargar — verificación: `tests/features/catalogo/product-detail-page.test.tsx` — un plato disponible y uno agotado muestran su texto; el agotado conserva nombre, precio y descripción.

## Verificación en navegador y cierre

- [x] Recorrer en navegador un plato disponible y uno agotado de la semilla: punto de color centrado y texto correctos; al entrar por primera vez, el título no se mueve al aparecer el estado — cubre: estado provisional, reserva de espacio.
- [x] Marcar un plato como agotado directamente en la base de datos, recargar el detalle y ver el cambio; comprobar que en el catálogo sigue apareciendo — cubre: estado actual, agotado no es inactivo.
- [x] Repasar cada criterio de `spec.md`, correr `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
