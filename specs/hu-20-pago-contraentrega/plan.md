# Plan: HU-20 — Detallar el pago contraentrega (efectivo o Yape)

`spec.md` en estado Clarificada.

## Backend

### Base de datos (migración `V11__cash_on_delivery.sql`)

- **`orders.status`**: se reemplaza el `CHECK` de `V10` (`orders_status_check`) para admitir `PENDIENTE_COBRO` además de `PENDIENTE_PAGO`, `PAGADO` y `CANCELADO`. Un pedido contraentrega nace en `PENDIENTE_COBRO` y no tiene `expires_at`, por lo que el job de vencimiento (que solo mira `PENDIENTE_PAGO`) no lo toca; el índice parcial `idx_orders_pending_expiry` tampoco cambia.
- **Columnas nuevas en `orders`** (copia del detalle de cobro, inmutable como el resto del pedido):
  - `collection_method` (`VARCHAR(10)`, nullable, `CHECK IN ('EFECTIVO', 'YAPE')`).
  - `cash_amount` (`NUMERIC(10,2)`, nullable, `CHECK (cash_amount > 0)`): monto con el que paga el cliente; el vuelto no se guarda, se calcula (`cash_amount - total`).
- **Restricciones de consistencia**:
  - `(payment_method = 'CONTRAENTREGA') = (collection_method IS NOT NULL)`.
  - `cash_amount IS NULL OR collection_method = 'EFECTIVO'`.
  - `cash_amount IS NULL OR cash_amount >= total`.
- Los pedidos existentes (todos `ONLINE`) cumplen las restricciones sin datos que migrar.

### Endpoints (paquete `pedidos`)

- `POST /api/pedidos` (Cliente): el mismo endpoint de HU-19, que ahora acepta `paymentMethod = CONTRAENTREGA`.
  - Request: se agrega `collection` (obligatorio con `CONTRAENTREGA`, prohibido con `ONLINE`): `{ "method": "EFECTIVO"|"YAPE", "cashAmount": 100.00|null }`. `cashAmount` solo se admite con `EFECTIVO`; con `YAPE` se ignora y no se guarda.
  - Response `201` con contraentrega: `{ "orderId": 42, "checkoutUrl": null }` (no hay pasarela).
  - Errores nuevos: `400` con mensaje en español si falta el medio, el monto tiene más de dos decimales, es cero o negativo, supera `S/ 10,000.00`, o llega `collection` con `ONLINE`; `400` si el monto es menor al total recalculado ("El monto debe ser al menos S/ 85.00"). Los demás (`409`, `422`, `404`, `401`, `403`) son los de HU-19.
- `GET /api/pedidos/{id}` (Cliente dueño): `OrderResponse` agrega `collectionMethod`, `cashAmount` y `change` (vuelto calculado en el servidor, `null` si no hay monto). `deliveryCode` se devuelve con `PAGADO` **o** `PENDIENTE_COBRO` (ya es un pedido confirmado y el cliente debe poder dárselo al repartidor); con `PENDIENTE_PAGO` y `CANCELADO` sigue sin enviarse.

### Capas

- **Controlador**: `OrderController.create` no cambia de forma; delega en `OrderService.create`.
- **Servicios**:
  - `OrderService.createOnlineOrder` pasa a `OrderService.create(userId, request)`: valida la coherencia entre `paymentMethod` y `collection` y despacha a `createOnlineOrder` (flujo de HU-19, sin cambios) o `createCashOnDeliveryOrder`.
  - `OrderService.createCashOnDeliveryOrder`: llama a `OrderLifecycleService.place`, que ya cancela el pedido en línea pendiente del cliente y reserva el stock; no llama a `PaymentGateway`, así que no necesita compensación. Devuelve `CreateOrderResponse(orderId, null)`.
  - `OrderLifecycleService.place` ya recalcula subtotal, delivery y total. Cambios: (1) si el método es `CONTRAENTREGA`, no fija `expires_at` y crea el pedido en `PENDIENTE_COBRO`; (2) valida `cashAmount >= total` **después** de calcular el total y antes de descontar el stock, dentro de la misma transacción, de modo que un monto insuficiente no toca el stock; (3) guarda `collection_method` y `cash_amount`.
- **Dominio**:
  - `OrderStatus` agrega `PENDIENTE_COBRO`.
  - Nuevo enum `CollectionMethod` (`EFECTIVO`, `YAPE`).
  - `Order` agrega los dos campos nuevos (`updatable = false`), un constructor/fábrica para contraentrega (estado `PENDIENTE_COBRO`, sin `expires_at`) y `getChange()`. `isPending()` sigue significando solo `PENDIENTE_PAGO`: el job de vencimiento y el webhook de Mercado Pago no deben tratar un pedido contraentrega como pagable.
- **DTO**: `CreateOrderRequest` agrega el record `Collection` (`@NotNull` en `method`, `@Digits(integer = 5, fraction = 2)` y `@DecimalMin("0.01")`, `@DecimalMax("10000.00")` en `cashAmount`); `OrderResponse` agrega los campos del detalle y la regla de `deliveryCode`.
- **Pasarela y webhook**: sin cambios. Un aviso de Mercado Pago para un pedido `PENDIENTE_COBRO` se trata como pago sobre un pedido no pendiente (se registra para revisión, ver `PaymentSettlementService`), nunca lo marca pagado.

## Frontend

- **`checkout-store.ts`**: agrega `collectionMethod: 'cash' | 'yape' | null` y `cashAmount: string` (texto tal como se escribe) con `setCollectionMethod` y `setCashAmount`. Se conservan al alternar entre Pago en línea y Contraentrega; `reset()` los limpia. Sigue sin persistirse.
- **`checkout-api.ts`**: `CreateOrderPayload` agrega `collection?: { method: 'EFECTIVO' | 'YAPE'; cashAmount: number | null }` y `paymentMethod: 'ONLINE' | 'CONTRAENTREGA'`; `CreatedOrder.checkoutUrl` pasa a `string | null`; `OrderStatus` agrega `PENDIENTE_COBRO`; `Order` agrega `collectionMethod`, `cashAmount` y `change`.
- **`cash-amount.ts`** (`features/checkout/`): `parseCashAmount(text)` devuelve el número o `null`, y `validateCashAmount(text, total)` devuelve el mensaje de error o `null` (vacío es válido; no numérico, cero, negativo, más de dos decimales, menor al total, mayor al máximo); `computeChange(amount, total)`. Aritmética en céntimos para evitar errores de coma flotante.
- **`components/cash-on-delivery-form.tsx`**: formulario "Detalle del pago contraentrega" (o "Detalle del pago al recoger" con Recojo). Selector "Cómo pagarás" con **Efectivo** y **Yape** como tarjetas seleccionables, igual que `payment-method-selector.tsx` (misma interacción y accesibilidad de radio). Con Efectivo muestra el campo "¿Con cuánto pagarás?" (`Input` del design system, marcado "Opcional", `inputMode="decimal"`), el error bajo el campo y el vuelto (`Vuelto: S/ 15.00`). Recibe valores y `onChange` por props; no habla con el store.
- **`payment-step-page.tsx`**: con `paymentMethod === 'cash_on_delivery'` monta el formulario bajo el selector. El botón principal pasa a "Confirmar pedido S/ xx.xx", habilitado cuando hay medio elegido, el monto es válido contra el total ya cargado y no hay una creación en curso o exitosa. Al confirmar llama a `createOrder` con `paymentMethod: 'CONTRAENTREGA'` y `collection` (el monto solo con Efectivo y si no está vacío) y, al éxito, navega con `useNavigate` a `/checkout/resultado?pedido={id}` (no es una redirección externa, así que no se recarga la aplicación). El aviso de error usa el título "No pudimos confirmar el pedido" con el mensaje del servidor en `400`, `409` y `422`.
- **`use-create-order.ts`**: `createOrderErrorMessage` acepta también `400` con mensaje, y el texto genérico depende del método ("No pudimos confirmar el pedido. Intenta de nuevo.").
- **`order-result-page.tsx`**: nuevo estado `PENDIENTE_COBRO`: título "Recibimos tu pedido", códigos (`OrderCodes`) con la indicación al recibir o al recoger, y un bloque "Pagarás con" que dice "Efectivo" y, si hay monto, "Pagarás con S/ 100.00 (vuelto S/ 15.00)", o "Yape". El carrito y el store de checkout se vacían con `PAGADO` **o** `PENDIENTE_COBRO`. `use-order.ts` ya solo consulta de nuevo mientras el estado es `PENDIENTE_PAGO`, así que no hace falta cambiar el sondeo ni el tope de espera.
- **`components/order-codes.tsx`**: sin cambios, salvo comprobar que la indicación sigue siendo correcta con Recojo.
- **Design system**: `Button`, `Card`, `Input`, `Notification` y tokens; sin componentes nuevos del design system.
- **Textos**: español, tuteo, sin emojis; precios con `formatPrice`.

## Seguridad

- El servidor recalcula subtotal, delivery y total; el monto declarado se compara con ese total, nunca con uno enviado por el cliente. El vuelto no se acepta del cliente: se calcula en el servidor y en la pantalla.
- Validación de `cashAmount` en el servidor (decimales, rango, método), con las mismas restricciones repetidas como `CHECK` en la base de datos.
- Con `YAPE` el monto no se persiste aunque llegue.
- `deliveryCode` solo se devuelve al dueño y con el pedido confirmado (`PAGADO` o `PENDIENTE_COBRO`).
- Un cliente solo accede a sus pedidos (`404` si es ajeno); el administrador recibe `403` como en HU-19.
- Bloqueos pesimistas de platos y del cliente: los de `OrderLifecycleService.place`, ya probados en HU-19.

## Decisiones

- **Un solo endpoint de creación** (`POST /api/pedidos`) con un bloque `collection` opcional, en lugar de un endpoint nuevo: reutiliza validaciones, reserva de stock y códigos; solo cambia lo que ocurre después (no hay pasarela).
- **`PENDIENTE_COBRO` como estado propio** (decisión de clarificación): evita que el vencimiento o un aviso de Mercado Pago lo toquen; `isPending()` queda limitado a `PENDIENTE_PAGO`.
- **Monto declarado `>= total` verificado en el servidor** dentro de `place`, antes de tocar el stock, para no reservar y luego rechazar.
- **El vuelto no se persiste**: se deriva de `cash_amount` y `total`, que son inmutables.
- **Navegación interna al resultado**: se reutiliza la pantalla de HU-19 sin redirección externa; el carrito se vacía en esa pantalla al ver el pedido confirmado, igual que con `PAGADO`.
- **Monto como texto en el store**: se valida y convierte al enviar, para no perder lo que el cliente escribe mientras tipea (por ejemplo `10.`).
- **`deliveryCode` visible con `PENDIENTE_COBRO`**: el pedido ya está confirmado y el código solo sirve junto con el pedido; no se envía con pedidos pendientes de pago o cancelados.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md` y su imagen: columnas `collection_method` y `cash_amount` en `orders` y el estado `PENDIENTE_COBRO`.
- `docs/historias.md` y `docs/cronograma.md`: estado de HU-20.
- `specs/hu-18-metodo-de-pago/spec.md` y `specs/hu-19-pago-en-linea/spec.md`: nota de que Contraentrega ya se conecta con HU-20 y que `POST /api/pedidos` deja de responder `400` con `CONTRAENTREGA`.
- `frontend/src/features/checkout/README.md`: formulario de contraentrega y estado nuevo del resultado.
