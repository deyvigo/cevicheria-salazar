# Plan: HU-44 — Ver los pedidos que usaron un cupón

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

### Endpoints (rol `ADMINISTRADOR`, bajo `/api/admin/**`)

| Método | Ruta                                   | Cambio                                                                 |
| ------ | -------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/admin/orders`                    | Nuevo parámetro opcional `coupon` (código).                            |
| GET    | `/api/admin/orders/coupon-summary`     | Nuevo. `?coupon=CEVICHE10` → `{ "pendingPayment": 2, "cancelled": 1 }`. |

- **Filtro de la lista**: `AdminOrderFilter` agrega `coupon` (normalizado con `CouponService.normalize`: `strip()` y mayúsculas, igual que el checkout; vacío = sin filtro). `AdminOrderQuery.predicates` agrega `cb.equal(order.get("couponCode"), filter.coupon())`. Se filtra por la copia `orders.coupon_code` y no por `coupon_id`: el código de un cupón con pedidos ya no cambia (HU-43), así que la copia identifica al cupón, y la URL lleva el código, no el id. Sigue la regla de HU-32: solo pedidos comprados.
- **Resumen de no comprados**: `AdminOrderService.couponSummary(code)` cuenta los pedidos con ese `coupon_code` en `PENDIENTE_PAGO` y en `CANCELADO`, con una consulta agrupada por `status` en `AdminOrderQuery` (o en `OrderRepository`). No aplica los demás filtros (spec). DTO `AdminCouponOrdersSummary(long pendingPayment, long cancelled)`. Un código vacío o inexistente responde ceros.
- **Base de datos**: sin migración. La lista del panel ya filtra pedidos comprados sin índices por cada filtro, y el volumen de pedidos con cupón es pequeño; si crece, un índice parcial sobre `orders (coupon_code) WHERE coupon_code IS NOT NULL`.
- **Tiempo real**: sin cambios en el servidor. Los avisos SSE solo llevan el id del pedido; el panel ya vuelve a pedir la lista.

## Frontend

- **Cupones** (`components/coupon-table.tsx`): en la columna Cupos, el número de usos es un `Link` a `/admin/pedidos?coupon=CODE&stage=ALL` cuando `hasOrders`, con `aria-label` "Ver pedidos con CODE"; sin pedidos queda como texto. El resto de la celda (`/ 50` o `/ Sin límite`) no cambia.
- **Estado de la vista** (`admin-orders-view.ts`): `OrdersView` agrega `coupon: string` (por defecto `''`). `parseView` lo lee de `?coupon=` (recortado y en mayúsculas), `viewToParams` lo escribe, `toQuery` lo envía como `coupon`, y `hasActiveFilters` lo cuenta, así "Limpiar filtros" (que vuelve a `DEFAULT_VIEW`) también lo quita. Cambiarlo vuelve a la página 1 como cualquier filtro.
- **API** (`admin-order-api.ts`): `OrderListParams.coupon` y `getCouponOrdersSummary(code)`.
- **Hook** `useCouponOrdersSummary(code)` en `use-admin-orders.ts`, con clave bajo `ADMIN_ORDERS_LIST_KEY` (`[...ADMIN_ORDERS_LIST_KEY, 'coupon-summary', code]`) y `enabled` solo con cupón: así lo invalida el mismo refresco en tiempo real que la lista, sin tocar `admin-orders-page.tsx` en esa parte.
- **Filtros** (`components/order-filters.tsx`): con `view.coupon`, una pastilla "Cupón: CEVICHE10" con un botón para quitarla (`aria-label` "Quitar el filtro de cupón"). No hay selector de cupones (fuera de alcance).
- **Aviso** `components/coupon-orders-notice.tsx` sobre la tabla, solo con filtro por cupón y algún conteo mayor que cero. El texto lo arma una función pura `couponOrdersNoticeText({ pendingPayment, cancelled })` en `order-labels.ts` (singular/plural, omite las partes en cero): "Además, 2 pagos en línea pendientes y 1 pago en línea vencido usaron este cupón. No aparecen aquí porque no se compraron." Si el resumen falla al cargar, no se muestra aviso (no bloquea la tabla).
- **Design system**: `Link` con el estilo de enlace ya usado en el panel, `Button`/`IconButton` para quitar el filtro y las utilities de la escala tipográfica.

## Decisiones

- **Código en la URL, no id**: es lo que el administrador ve y comparte; y el código de un cupón con pedidos es fijo.
- **Resumen en un endpoint aparte** en lugar de agregar campos a `PageResponse`: la respuesta paginada es compartida por todo el panel, y el resumen no depende de la página ni de los demás filtros.
- **El enlace abre con estado de entrega "Todos"**: los usos incluyen pedidos entregados, que la vista por defecto ("Activos") ocultaría.

## Impacto en docs/

- `docs/historias.md`, `docs/epicas.md`, `docs/cronograma.md`: HU-44 ya registrada.
- `specs/hu-43-gestion-cupones/spec.md`: ya enlaza HU-44 en fuera de alcance.
- `docs/diagrama-de-base-de-datos.md`: sin cambios (no hay migración).
