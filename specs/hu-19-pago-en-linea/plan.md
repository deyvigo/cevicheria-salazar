# Plan: HU-19 — Pagar en línea con Mercado Pago

`spec.md` en estado Clarificada.

## Backend

### Base de datos (migración `V10__orders.sql`)

- **Secuencia** `order_code_seq` (inicio 1): el código de pedido es `SAL-` más el valor de la secuencia con seis dígitos (`SAL-001042`), generado por `OrderCodeGenerator` al crear el pedido.
- **`orders`**:
  - `id` (identidad), `code` (`VARCHAR(12)`, único), `delivery_code` (`VARCHAR(4)`, solo dígitos, `CHECK (delivery_code ~ '^[0-9]{4}$')`).
  - `user_id` (FK a `users`, sin cascada), `status` (`PENDIENTE_PAGO`, `PAGADO`, `CANCELADO`), `payment_method` (`ONLINE`, `CONTRAENTREGA`; HU-20 usa el segundo), `delivery_type` (`ENTREGA`, `RECOJO`). Son `VARCHAR` con `CHECK` y `@Enumerated(STRING)`, no tipos enumerados de Postgres, para que Hibernate en modo `validate` no necesite mapeo nativo.
  - Copia de la entrega: `address_id` (FK nullable a `addresses`), más `address_label`, `address_text`, `address_reference`, `address_latitude`, `address_longitude` y `delivery_zone_name`, para no depender de cambios posteriores.
  - Importes en soles (`NUMERIC(10,2)`): `subtotal`, `discount`, `delivery_price`, `total`.
  - `expires_at` (vencimiento del pago, 30 min), `paid_at`, `cancelled_at`, `cancel_reason`, `created_at`, `updated_at`.
  - Índices por `user_id`, y por `(status, expires_at)` para el job de vencimiento.
- **`order_items`**: `order_id` (FK, cascada), `product_id` (FK a `products`, sin cascada), `product_name`, `unit_price`, `quantity`, `line_total` (copias al momento de la compra).
- **`payments`**: `order_id` (FK), `provider` (`MERCADOPAGO`), `provider_payment_id` (único por proveedor, para la idempotencia), `status` (texto del proveedor), `amount`, `raw_status_detail`, `needs_review` (boolean), `created_at`, `updated_at`. Más `preference_id` y `init_point` en `orders` (o en una fila `payments` pendiente; ver Decisiones).
- Hibernate sigue en `validate`; las entidades se mapean a estas tablas.

### Endpoints (paquete `pedidos`)

- `POST /api/pedidos` (Cliente): crea el pedido en línea.
  - Request: `{ "items": [{ "productId": 1, "quantity": 2 }], "deliveryType": "ENTREGA"|"RECOJO", "addressId": 5|null, "paymentMethod": "ONLINE" }`. `paymentMethod = CONTRAENTREGA` responde `400` por ahora (HU-20 lo habilita con un bloque `collection`).
  - Response `201`: `{ "orderId": 42, "checkoutUrl": "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=..." }`.
  - Errores: `409` con un mensaje que nombra el plato (stock insuficiente o no disponible), `422` dirección sin cobertura, `404` dirección ajena o inexistente (`AddressNotFoundException`), `502` si Mercado Pago falla, `400` validación, `401`/`403` sin sesión o administrador.
- `GET /api/pedidos/{id}` (Cliente dueño): `{ id, code, status, deliveryType, paymentMethod, subtotal, deliveryPrice, total, items[], paymentStatus, deliveryCode }` (`paymentStatus` es el estado del último pago informado por el proveedor); `deliveryCode` solo cuando `status = PAGADO`. Pedido ajeno o inexistente: `404` (`OrderNotFoundException`).
- `POST /api/pagos/mercadopago/webhook` (público, sin sesión): recibe la notificación de Mercado Pago. Responde `200` con cuerpo vacío si la firma es válida (aunque el pago no cambie nada) y `401` si la firma no coincide, y `503` si no se pudo consultar el pago a Mercado Pago, para que reintente solo cuando haga falta.

### Capas

- **Controladores**: `OrderController` (crear y consultar), `MercadoPagoWebhookController`. Leen `Authentication` con `AuthenticatedUser.id(...)`; el administrador recibe `403` como en `AddressController`.
- **Servicios**:
  - `OrderService.createOnlineOrder(userId, request)` (`@Transactional`): valida cliente activo; carga los platos con bloqueo de fila (`PESSIMISTIC_WRITE`, ordenados por id para no generar interbloqueos); valida activo, no eliminado, disponible y stock; valida la entrega con `AddressService.getOwned` y la misma consulta de zona de `DeliveryZoneRepository.findCheapestCovering` que usa `DeliveryCostService`; calcula subtotal, delivery y total en el servidor; **cancela el pedido pendiente anterior del cliente** (libera su stock); descuenta el stock; genera `code` y `delivery_code` (`SecureRandom`); persiste pedido e ítems. Después de confirmar la transacción pide la preferencia a Mercado Pago (la llamada externa va **fuera** de la transacción de base de datos); si falla, `OrderService.cancel(...)` libera el stock y devuelve `502`.
  - `OrderQueryService.getOwned(userId, orderId)`.
  - `OrderExpirationJob`: `@Scheduled` cada minuto; cancela los `PENDIENTE_PAGO` con `expires_at` vencido y libera el stock. Requiere `@EnableScheduling` (hoy no existe).
  - `PaymentGateway` (interfaz, en `pedidos`): `createCheckout(order)` devuelve `{ preferenceId, checkoutUrl }` y `getPayment(paymentId)` devuelve un `GatewayPayment` propio (`id`, `status`, `amount`, `currency`, `externalReference`). El resto del código solo conoce esta interfaz y sus tipos, nunca clases del SDK.
  - `MercadoPagoGateway` (implementación, solo en la capa de servicios): usa el **SDK oficial de Mercado Pago para Java** (`com.mercadopago:sdk-java`; la versión se fija al implementar, tras comprobar en Maven Central su última versión estable y su compatibilidad con Spring Boot 4 y Jackson). Configura el access token (`MP_ACCESS_TOKEN`) una sola vez y traduce los errores del SDK a `PaymentGatewayException`.
    - Preferencia (`PreferenceClient`): un ítem por plato (`title`, `quantity`, `unit_price`, `currency_id = PEN`) y un ítem "Entrega" si hay delivery; `external_reference = order.id`; `back_urls` (éxito, fallo y pendiente) a `{APP_FRONTEND_URL}/checkout/resultado?pedido={id}` con `auto_return = approved`; `notification_url = {APP_PUBLIC_API_URL}/api/pagos/mercadopago/webhook`; `expires = true` con `expiration_date_to = expires_at`; `payment_methods.excluded_payment_types` con `ticket` y `atm` (medios diferidos); sin `payer`: el correo y el nombre los pide Mercado Pago en su página (un correo con cuenta real rompe las pruebas con credenciales de prueba).
  - `MercadoPagoSignatureVerifier` valida `x-signature` (`ts` y `v1`) con HMAC-SHA256 y `MP_WEBHOOK_SECRET` sobre `id:{data.id};request-id:{x-request-id};ts:{ts};` con comparación en tiempo constante, antes de hacer nada.
  - `PaymentWebhookService.handlePayment(paymentId)` (usa `PaymentGateway`, no el SDK directamente) y `PaymentSettlementService.apply` (bean aparte para que su transacción se abra de verdad): (1) la firma ya fue validada; (2) consulta `getPayment(id)` a Mercado Pago (`PaymentClient` del SDK, dentro de la implementación); (3) localiza el pedido por `external_reference`; (4) aplica la transición en una transacción bloqueando el pedido: `approved` con el importe y la moneda correctos y el pedido `PENDIENTE_PAGO` → `PAGADO` (`paid_at`); `approved` con importe distinto o con pedido `CANCELADO` → pago guardado con `needs_review = true` sin cambiar el pedido; `rejected`/`cancelled` → solo registra el intento y el pedido sigue pendiente (el cliente puede reintentar en Mercado Pago); cualquier otro estado → solo registra; (5) es idempotente por `provider_payment_id` (restricción única y `UPDATE` condicional por estado).
- **Repositorios**: `OrderRepository` (por `id` y `user_id`, pendientes vencidos, pendiente de un cliente), `PaymentRepository`, y `ProductRepository.findAllByIdInForUpdate(ids)` con bloqueo.
- **Configuración**: `MercadoPagoProperties` (`app.mercadopago.access-token`, `webhook-secret`, `public-api-url`), `app.orders.payment-ttl=30m`. Variables nuevas: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_PUBLIC_API_URL`; se quitan `IZIPAY_API_KEY` e `IZIPAY_HMAC_KEY`.

## Frontend

- **Ruta y acceso**:
  - `/checkout/pago` sigue bajo `CheckoutGuard requireDelivery`.
  - `/checkout/resultado` **no** usa ese guard (`OrderResultGuard`) (el cliente llega desde un sitio externo y el store está vacío): usa un guard de sesión que, sin sesión, lleva a `/iniciar-sesion` con retorno a la misma URL. El indicador de pasos se muestra con `isAuthenticated` verdadero (cuatro pasos).
- **`checkout-api.ts`**: `createOrder(payload)` (`POST /pedidos`) y `getOrder(id)` (`GET /pedidos/{id}`); el `payload` se arma con el carrito, `deliveryType`, `selectedAddressId` y `paymentMethod` del store.
- **`payment-step-page.tsx`**: con `paymentMethod === 'online'` el botón pasa a "Pagar S/ xx.xx" (habilitado cuando el total ya cargó); `useMutation` de `createOrder`; mientras se envía queda deshabilitado y en carga; al éxito hace `window.location.assign(checkoutUrl)`; al error muestra un mensaje (stock, plato no disponible, sin cobertura, error genérico) con "Reintentar". Con contraentrega o sin método sigue deshabilitado.
- **`order-result-page.tsx`** (`features/checkout/`): lee `pedido` de la URL; `useOrder(id)` con `useQuery` y `refetchInterval` de unos 3 s mientras `status = PENDIENTE_PAGO`, con tope de tiempo (unos 2 min) tras el cual muestra "te avisaremos". Estados: pagado (código de pedido, código de entrega con su indicación según Entrega o Recojo, y el carrito y el checkout se vacían), pendiente, "no se completó" (pedido cancelado o último pago rechazado, con enlace al carrito), no encontrado y error de carga con "Reintentar".
- **Componentes de feature**: `components/order-codes.tsx` (muestra los dos códigos, el de entrega en tamaño grande y espaciado para leerse en voz alta).
- **Design system**: `Button`, `Card`, `Notification` y tokens; sin componentes nuevos del design system.
- **Textos**: español, tuteo, sin emojis; precios con `formatPrice`.

## Seguridad

- El frontend nunca ve credenciales de Mercado Pago ni datos de tarjeta; la integración está solo en el backend (`MercadoPagoGateway`).
- El webhook es público, pero su única entrada confiable es la firma: se valida con HMAC antes de hacer nada, y aun así el estado del pago se **vuelve a consultar** a Mercado Pago con el access token en lugar de fiarse del cuerpo.
- Se compara el importe, la moneda y la referencia del pago con el pedido antes de marcarlo como pagado.
- Los importes nunca vienen del cliente; el servidor los recalcula desde la base.
- Un cliente solo accede a sus pedidos (`404` si es ajeno); `deliveryCode` solo se devuelve al dueño y con el pedido pagado.
- El código de entrega se guarda en claro porque debe poder mostrarse de nuevo al cliente; no es una credencial de sesión (ver `spec.md`). Se genera con `SecureRandom`.
- Bloqueo pesimista de los platos al crear el pedido para evitar vender stock de más con peticiones simultáneas.
- Consultas con parámetros enlazados; los logs no incluyen el access token ni el cuerpo completo del pago.

## Decisiones

- **Checkout Pro con redirección**, sin Bricks: el cliente no necesita cuenta de Mercado Pago y la aplicación no toca datos de tarjeta.
- **SDK oficial de Mercado Pago** detrás de la interfaz `PaymentGateway` con su implementación `MercadoPagoGateway`: los modelos de preferencia y de pago vienen tipados; si el SDK diera problemas se reemplaza la implementación sin tocar el resto. La validación de la firma del webhook se implementa a mano, porque el SDK no la hace por nosotros.
- **Llamada a Mercado Pago fuera de la transacción**: no se mantienen bloqueos de fila abiertos durante una llamada de red; el fallo se compensa cancelando el pedido.
- **Reserva de stock al crear el pedido**, con liberación al cancelar o vencer (decisión de clarificación).
- **Un solo pedido pendiente por cliente**: al reintentar se cancela el anterior.
- **`preference_id` e `init_point`** se guardan en `orders` (columnas nullable) para depurar y para reabrir el pago si hiciera falta; no se usa fila previa en `payments`.
- **Vencimiento con margen**: el job cancela los pedidos vencidos hace más de 2 minutos (`app.orders.expiry-grace`) para que un pago aprobado justo en el límite no compita con su cancelación.
- **Token por petición**: el SDK recibe el access token en cada llamada (`MPRequestOptions`) en vez de `MercadoPagoConfig.setAccessToken`, que es estado global estático.
- **Un rechazo no cancela el pedido**: ver la decisión en `spec.md`.
- **Estado final solo por webhook**: el retorno del navegador nunca cambia el pedido; la pantalla de resultado solo consulta.
- **Código de pedido con secuencia de Postgres**: correlativo sin colisiones ni reintentos bajo concurrencia.
- **Reutilizar HU-17**: `DeliveryCostService` y `AddressService.getOwned` calculan y validan la entrega al crear el pedido.

## Impacto en docs/

- Reemplazar Izipay por Mercado Pago en `AGENTS.md`, `README.md`, `docs/diagrama-de-arquitectura.md`, `docs/diagrama-de-despliegue.md`, `docs/diagrama-de-casos-de-uso.md`, `docs/guia-de-despliegue.md`, `backend/.env.example` y `specs/ht-09-entorno/`; regenerar las imágenes que nombren la pasarela.
- `docs/diagrama-de-base-de-datos.md` y su imagen: `orders` (con `code` y `delivery_code`), `order_items` y `payments`, más sus relaciones.
- `docs/diagrama-de-arquitectura.md`: servicio de pedidos, servicio de pagos y el webhook entrante.
- `docs/guia-de-despliegue.md`: variables `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_PUBLIC_API_URL` y la URL pública del webhook (Traefik, HTTPS); cómo probar en local con un túnel y las credenciales de prueba.
- `docs/historias.md` y `docs/cronograma.md`: estado de HU-19.
- `specs/hu-18-metodo-de-pago/spec.md`: "Continuar" ya se conecta con el pago en línea.
- `frontend/src/features/checkout/README.md` y el README del backend si lo hay: pantalla de resultado, endpoints y servicios.
