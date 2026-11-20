# Plan: HU-26 — Seguir el estado de mi pedido

`spec.md` en estado Clarificada.

## Backend

### Endpoints

| Método y ruta | Quién | Request | Respuesta |
| --- | --- | --- | --- |
| `PATCH /api/admin/orders/{id}/delivery-status` | Administrador | JSON `{ from, to, reason? }` (reemplaza `?from=`) | `200` `AdminOrderRow`; `400` motivo faltante o largo; `409` transición inválida o fila desactualizada |
| `PATCH /api/admin/orders/{id}/refund` | Administrador | — | `200` `AdminOrderRow`; `409` si no hay reembolso pendiente |
| `POST /api/orders/{id}/cancel` | Cliente dueño | — | `200` `OrderResponse`; `409` si no está `PENDIENTE`; `404` si no es suyo |

`GET /api/admin/orders` acepta `deliveryStatus` con los 10 estados, `ACTIVE` y `ALL`, y `refund=PENDIENTE`.

### Capas

- **`DeliveryStatus`**: 10 valores; `canMoveTo(to, type)`, `isFinal()`, `forwardFor(type)`, `notifiesCustomer(type)`.
- **`Order`**: `moveDelivery(expected, to, reason)` reemplaza `advanceDelivery`; fija `deliveryReason`, `deliveryUpdatedAt` y `refundStatus` (`PENDIENTE` si pasa a `RECHAZADO`/`CANCELADO` con `status = PAGADO`); `markRefunded()`.
- **`OrderLifecycleService.changeDelivery`**: bloquea el pedido y sus platos, mueve el estado, repone stock en `RECHAZADO`/`CANCELADO` (reutiliza `release` sin tocar `status` de pago), publica `OrderChangedEvent(UPDATED)` y `OrderDeliveryChangedEvent`. `OrderService.cancelOwn` valida dueño y `PENDIENTE`.
- **`OrderDeliveryNotificationListener`** (`AFTER_COMMIT` + `@Async`) envía el correo de hito con `MailService.sendOrderStatusEmail` y `OrderStatusMail`.
- **`OrderConfirmationService`**: etiqueta de los 10 estados; el correo de compra dice "Recibimos tu pedido, esperando confirmación".
- **`AdminOrderQuery`/`AdminOrderFilter`/`AdminOrderRow`/`AdminOrderDetail`**: nuevos estados, orden por flujo, filtro de reembolso, `deliveryReason` y `refundStatus`.

### Base de datos

`V15__order_delivery_flow.sql`: nuevo `CHECK` con los 10 estados y `DEFAULT 'PENDIENTE'`; columnas `delivery_reason`, `delivery_updated_at`, `refund_status` (`PENDIENTE`/`REEMBOLSADO`, nulo) y `refunded_at`.

## Frontend

- **Pantallas**: "Mis pedidos" (historial y detalle/confirmación) y `/admin/pedidos`.
- **Componentes del design system**: `Button`, `Dialog` (motivo, confirmaciones), `Notification` (estados negativos), `Input`.
- Etiquetas y mensajes por estado en un único módulo; barra de 5 hitos para el cliente según tipo; botones principal y secundario por estado en el panel; diálogo de motivo con `react-hook-form` + `zod`; botón "Cancelar pedido" del cliente.

## Seguridad

- Rutas de admin tras `AdminAccessInterceptor`; el cliente solo cancela pedidos propios (404 si no, para no filtrar existencia).
- El servidor valida la transición y no confía en el estado enviado por el navegador (solo `from` como comprobación optimista).
- El motivo se almacena como texto y se escapa al enviarlo por correo y al pintarlo.

## Decisiones

- `LISTO_PARA_ENVIO` existe para el panel pero se muestra al cliente como "Preparando"; evita un hito casi simultáneo con `EN_PREPARACION`.
- El conjunto de estados notificados vive en `DeliveryStatus.notifiesCustomer` para ajustarlo en un solo lugar.
- No se migran datos: los tres estados antiguos siguen siendo válidos.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: estados y columnas nuevas de `orders`.
- `specs/hu-32-hu-33-pedidos-admin/spec.md`: nota de que HU-26 reemplaza los 3 estados y la ausencia de avisos.
