# Tareas: HU-44 — Ver los pedidos que usaron un cupón

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] Parámetro `coupon` en `GET /api/admin/orders` (`AdminOrderFilter`, `AdminOrderQuery`, `AdminOrderController`) — cubre: filtro por cupón combinado con los demás, código sin distinguir mayúsculas ni espacios, solo pedidos comprados — verificación: `AdminOrdersIT` — con pedidos de dos cupones distintos y uno sin cupón, `?coupon= ceviche10 &deliveryStatus=ALL` devuelve solo los comprados de `CEVICHE10`; combinado con `type=RECOJO` se restringe más; un código sin pedidos devuelve página vacía; un pedido `PENDIENTE_PAGO` o `CANCELADO` con el cupón no aparece.
- [x] `GET /api/admin/orders/coupon-summary` — cubre: aviso de pedidos no comprados — verificación: el mismo IT — con 2 pedidos `PENDIENTE_PAGO`, 1 `CANCELADO` y 1 `PAGADO` con el cupón devuelve `{ pendingPayment: 2, cancelled: 1 }`; otro cupón o un código inexistente devuelve ceros; sin sesión `401`, cliente `403`.

## Frontend

- [x] `admin-orders-view.ts` con `coupon` — cubre: filtro en la URL, recargar lo conserva, Limpiar filtros lo quita, vuelve a la página 1 — verificación: `tests/features/admin/admin-orders-view.test.ts` — `?coupon= ceviche10` se lee como `CEVICHE10` y vuelve a la URL; `hasActiveFilters` es verdadero con cupón; `toQuery` lo envía.
- [x] `admin-order-api.ts` y `useCouponOrdersSummary` — cubre: datos del aviso y su refresco en tiempo real — verificación: tests de la página con la API simulada.
- [x] Pastilla "Cupón: …" en `components/order-filters.tsx` — cubre: ver y quitar el filtro — verificación: `tests/features/admin/admin-orders-page.test.tsx` — se muestra solo con cupón y al quitarla la URL queda sin cupón.
- [x] `couponOrdersNoticeText` en `order-labels.ts` y `components/coupon-orders-notice.tsx` — cubre: textos del aviso, singular/plural, partes en cero, sin aviso si todo está comprado — verificación: `tests/features/admin/order-labels.test.ts` (nuevo) y `tests/features/admin/admin-orders-page.test.tsx` — con filtro por cupón y resumen `{2, 1}` se ve el aviso; con `{0, 0}` o sin cupón, no.
- [x] Enlace de usos en `components/coupon-table.tsx` — cubre: llegar desde Cupones con estado "Todos", sin enlace cuando no hay pedidos, enlace con `0 / 50` si hay pedidos — verificación: `tests/features/admin/components/coupon-table.test.tsx`.

## Documentación

- [x] Revisar que `docs/` y la spec de HU-43 sigan correctas (sin migración) — cubre: impacto en documentación — verificación: revisión de los `.md`.

## Verificación en navegador y cierre

- [x] Con la semilla `dev`: crear pedidos con un cupón (uno contraentrega, uno en línea sin pagar), ir desde Cupones a Pedidos, ver la pastilla, la lista con estado "Todos" y el aviso del pago pendiente; quitar el filtro; combinarlo con otro filtro; recargar — cubre: criterios de llegar desde Cupones, filtro y aviso.
- [x] Repasar cada criterio de `spec.md`, correr `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm lint`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
