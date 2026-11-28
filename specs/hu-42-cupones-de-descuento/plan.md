# Plan: HU-42 — Aplicar un cupón de descuento al pagar

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

- **Endpoints** (paquete `pedidos`, nuevo `CouponController`):
  - `POST /api/coupons/quote` (CLIENTE): body `{ code, items: [{ productId, quantity }] }`. Responde `{ code, discount, subtotal }` con el código normalizado y el descuento calculado sobre los precios vigentes de la base. Si el cupón no aplica: 422 con `{ reason, message }` (ver Errores). No reserva nada ni cuenta un uso.
  - `POST /api/orders`: `CreateOrderRequest` agrega `couponCode` (opcional, hasta 30 caracteres). Si viene, se valida y aplica dentro de la creación del pedido.
  - `OrderResponse` agrega `discount` y `couponCode`; `AdminOrderDetail` agrega `couponCode` (ya tiene `discount`).
- **Capas**:
  - Entidad `Coupon` (`DiscountType`: `PERCENTAGE` o `FIXED`) y `CouponRepository` con `findByCode`, `findByCodeForUpdate` (bloqueo de fila) y la cuenta de usos.
  - `CouponService` (sin estado HTTP): `normalize(code)` (`trim` + mayúsculas), `evaluate(coupon, subtotal, userId, now)` que valida activo, vigencia, mínimo y límites y devuelve el descuento, y `quote(userId, request)` que calcula el subtotal con los precios de `ProductRepository` (platos inexistentes, inactivos o no disponibles no suman, igual que el resumen del carrito).
  - `OrderLifecycleService.place` recibe el cupón: tras liberar los pedidos pendientes anteriores (`REEMPLAZADO`) y calcular el subtotal, bloquea la fila del cupón, lo evalúa y llama a `order.applyCoupon(coupon, discount)` (vía `CouponService.applyForOrder`). El monto mínimo de efectivo (`cashAmount`) se compara contra el total **con** descuento.
  - `Order`: `applyCoupon` fija `couponId`, `couponCode` y `discount`, y recalcula `total = subtotal − discount + deliveryPrice`.
  - `OrderService.toCheckoutRequest`: Mercado Pago no acepta ítems con precio negativo, así que con descuento se envía **una sola línea** "Pedido SAL-001042" por el total; sin descuento se mantienen las líneas por plato y la de entrega.
  - `OrderConfirmationService`: fila "Descuento (CÓDIGO)" en el correo cuando `discount > 0`.
  - `CouponAttemptService` (Redis, mismo patrón que `PasswordChangeAttemptService`): clave `coupons:attempts:{userId}`, 10 cotizaciones fallidas en 15 minutos bloquean con `TooManyAttemptsException` (429). Una cotización válida no reinicia el contador, para que alternar un código bueno con intentos no permita probar sin límite.
- **Cálculo del descuento** (en `BigDecimal`, escala 2):
  - `PERCENTAGE`: `subtotal × valor / 100`, redondeado `HALF_UP` a céntimos.
  - `FIXED`: el valor.
  - En ambos casos, `min(descuento, subtotal)`.
- **Usos**: no se guarda un contador. Los usos de un cupón son los pedidos con ese `coupon_id` cuyo `status` es `PENDIENTE_PAGO`, `PENDIENTE_COBRO` o `PAGADO`. Así:
  - Un pago en línea que vence, se reemplaza o falla en la pasarela pasa a `CANCELADO` y libera el uso solo.
  - Un pedido rechazado o cancelado desde el panel (o por el cliente en HU-26) conserva su `status` de pago (`PAGADO` o `PENDIENTE_COBRO`; solo cambia `delivery_status`), por lo que el uso no se libera, como se decidió.
  - El bloqueo de la fila del cupón durante `place` serializa los pedidos simultáneos con el mismo cupón: el segundo ve el uso del primero y se rechaza si se agotó.
- **Errores** (`CouponNotApplicableException`, 422, en `common/exception`, mapeada en `ApiExceptionHandler`): `ApiError` con `error` = motivo y `message` en español.

  | Motivo         | Mensaje                                               |
  | -------------- | ----------------------------------------------------- |
  | `NOT_FOUND`    | Este código no es válido (no existe o está inactivo). |
  | `EXPIRED`      | Este código ya venció.                                |
  | `NOT_STARTED`  | Este código aún no está disponible.                   |
  | `MIN_SUBTOTAL` | Este código es válido desde una compra de S/ 40.00.   |
  | `EXHAUSTED`    | Ya no puedes usar este código (límite total o del cliente). |

- **Base de datos**: migración `V20__coupons.sql`:
  - Tabla `coupons`: `id`, `code VARCHAR(30)` (guardado ya normalizado, `UNIQUE`, `CHECK (code = upper(code))`), `discount_type VARCHAR(10)` (`PERCENTAGE` o `FIXED`), `discount_value NUMERIC(10,2) CHECK > 0` y `CHECK` de máximo 100 para `PERCENTAGE`, `min_subtotal NUMERIC(10,2)` nullable, `starts_at` y `ends_at TIMESTAMPTZ` nullable (`CHECK starts_at < ends_at`), `max_uses` y `max_uses_per_customer INTEGER` nullable (`CHECK > 0`), `is_active BOOLEAN DEFAULT TRUE`, `created_at`, `updated_at`.
  - `orders`: `coupon_id BIGINT` (FK a `coupons`, sin cascada) y `coupon_code VARCHAR(30)` (copia, como `product_name` en `order_items`), con `CHECK` de que ambos sean nulos o ambos no nulos.
  - Índice parcial `idx_orders_coupon_usage ON orders (coupon_id, user_id) WHERE coupon_id IS NOT NULL AND status IN ('PENDIENTE_PAGO','PENDIENTE_COBRO','PAGADO')` para contar usos.
  - Datos de ejemplo solo en desarrollo: `db/dev/R__sample_coupons.sql` (perfil `dev`, como `R__sample_products.sql`): `CEVICHE10` (10 %, mínimo S/ 30.00), `BIENVENIDA5` (S/ 5.00, una vez por cliente) y `VENCIDO` (fuera de vigencia), con `ON CONFLICT (code) DO NOTHING`.

## Frontend

- **Estado** (`checkout-store.ts`): `couponCode: string | null` (el código aplicado), `setCouponCode` y limpieza en `reset`. No se persiste, igual que el resto del checkout (recargar pierde el cupón).
- **Datos**: `checkout-api.ts` agrega `quoteCoupon(code, items)` y `couponErrorMessage(error)`. Hook `use-coupon-quote.ts` con `useQuery` (clave `['coupon-quote', code, items]`, `retry: false`, `staleTime` de 30 s para que la cotización que deja "Aplicar" no se pida dos veces), activo solo con un código aplicado: cuando cambia el carrito se vuelve a cotizar solo. Si una recotización falla por un motivo de cupón, el código se quita del estado y se avisa con `Notification` ("Quitamos el cupón CEVICHE10: …").
- **Resumen**: `computeOrderSummary(items, productsById, discount = 0)` reemplaza la constante `DISCOUNT` (se elimina) y limita el descuento al subtotal. `OrderSummary` muestra la etiqueta "Descuento (CEVICHE10)" y el monto como `-S/ 8.25` (igual que el panel) cuando es mayor que cero; sin cupón sigue `S/ 0.00` (en `/cart` no cambia nada).
- **Componente** `src/features/checkout/components/coupon-form.tsx`: `Input` "Código de descuento" + `Button` "Aplicar" (con carga), error bajo el campo y, con cupón aplicado, el código con un enlace de texto "Quitar" (un `button` con aspecto de enlace, en la misma línea; cambiado en HT-12 porque un `Button` completo pesaba más que el botón principal y partía la línea del código). Se renderiza dentro de `OrderSummary` del paso Pago, sobre el botón principal. Formulario con `react-hook-form` + `zod` (requerido, máximo 30 caracteres). "Aplicar" llama a la cotización con una mutación; si responde bien, guarda el código en el estado.
- **Pago** (`payment-step-page.tsx`): el total y el monto mínimo de efectivo usan el descuento cotizado; `submit` envía `couponCode`. Mientras la cotización está cargando, "Pagar" y "Confirmar pedido" quedan deshabilitados. Si la creación del pedido falla con 422 de cupón, se quita el cupón y se muestra el mensaje.
- **Después de comprar**: `order-summary-table.tsx` (usado por la confirmación de HU-21 y el detalle de HU-40) muestra la fila "Descuento (CÓDIGO)" si `discount > 0`; `checkout-api.ts` agrega `discount` y `couponCode` al tipo del pedido. El historial (HU-25) muestra el total, que ya trae el descuento: no cambia.
- **Panel**: `order-detail-dialog.tsx` ya muestra el descuento; se agrega el código en la etiqueta. No se agrega gestión de cupones.
- **Componentes del design system**: `Input`, `Button` (secundario para "Aplicar"; "Quitar" es un enlace de texto, ver arriba) y `Notification`.

## Seguridad

- El descuento siempre lo calcula el servidor con los precios de la base; `quote` solo informa y `POST /api/orders` vuelve a validar todo.
- Límite de intentos por cliente (Redis) contra la prueba masiva de códigos. Los mensajes no revelan si un código existe pero está inactivo (`NOT_FOUND` cubre ambos casos).
- Las rutas de cupones exigen rol `CLIENTE` (`SecurityConfig`); el usuario sale de la sesión, nunca del body.

## Decisiones

- **Usos derivados de `orders` en vez de un contador**: no hay que acordarse de devolver usos en cada camino de cancelación (vencido, reemplazado, error de pasarela), y la regla de la spec (la contraentrega no libera el uso) sale sola de que esos pedidos nunca pasan a `CANCELADO`.
- **Bloqueo de la fila del cupón** dentro de la transacción de `place`, igual que el bloqueo de platos y del cliente que ya usa: los límites no se pueden sobrepasar con pedidos simultáneos.
- **Una línea agregada para Mercado Pago con descuento**: Checkout Pro no tiene ítems negativos, y repartir el descuento entre platos generaría céntimos que no cuadran.
- **Cotización en un endpoint aparte** en vez de calcular en el frontend: el cliente no conoce las reglas del cupón (mínimo, límites) y no debe conocerlas.
- **Paquete `pedidos`**: el cupón se aplica al pedido. La gestión desde el panel (historia posterior de E6) irá en `admin` y reutilizará `Coupon` y `CouponRepository`.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: tabla `coupons`, columnas `orders.coupon_id` y `orders.coupon_code`, y cómo se cuentan los usos (migración `V20`); actualizar la imagen del diagrama.
- `docs/diagrama-de-casos-de-uso.md` (y su imagen): "Aplicar cupón de descuento" (HU-42) para el Cliente.
- `docs/cronograma.md`: incluir HU-42 cuando se asigne a un sprint.
- `specs/hu-14-ver-resumen-del-pedido/plan.md`: la constante `DISCOUNT` se reemplaza por el descuento cotizado.
- `frontend/src/features/checkout/README.md` y `frontend/src/features/carrito/README.md`.
