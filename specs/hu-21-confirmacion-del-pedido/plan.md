# Plan: HU-21 — Confirmar el pedido con su número y correo de confirmación

`spec.md` en estado Clarificada.

## Backend

### Rutas de la API en inglés

Cambian solo los `@RequestMapping`/`@GetMapping`/`@PutMapping` y los clientes que los llaman; nombres de campos, validaciones y respuestas quedan igual.

| Antes | Después |
| --- | --- |
| `/api/pedidos` | `/api/orders` |
| `/api/pedidos/costo-delivery` (parámetro `direccionId`) | `/api/orders/delivery-cost` (parámetro `addressId`) |
| `/api/pagos/mercadopago/webhook` | `/api/payments/mercadopago/webhook` |
| `/api/perfil` y `/api/perfil/contrasena` | `/api/profile` y `/api/profile/password` |
| `/api/perfil/direcciones` | `/api/profile/addresses` |

- **Spring Security**: `SecurityConfig` no menciona estas rutas hoy (`/api/pedidos/**` ya exige sesión por la regla general); se verifica con `grep` que ninguna regla ni filtro (por ejemplo el del webhook de Mercado Pago o el de CSRF) dependa de las rutas viejas.
- **Webhook de Mercado Pago**: `MercadoPagoGateway` arma el `notification_url` de cada preferencia a partir de `APP_PUBLIC_API_URL` + la ruta del controlador; hay que actualizar esa constante junto al controlador. Los pedidos en línea pendientes creados antes del despliegue conservan la URL vieja en su preferencia: al desplegar, esperar a que no queden pedidos `PENDIENTE_PAGO` (vencen por tiempo, `expires_at`) o, si no es posible, dejar la ruta vieja como alias solo del webhook hasta entonces. Además se actualiza la URL registrada en el panel de Mercado Pago (respaldo).
- **Sin alias** para el resto: el frontend y el backend se despliegan juntos y la API no tiene otros clientes.
- **Orden de rutas**: `/api/orders/delivery-cost` y `/api/orders/{id}` coexisten sin conflicto (`{id}` es numérico y el literal tiene prioridad), igual que hoy con `/pedidos/costo-delivery`.

### Respuesta del pedido (paquete `pedidos`)

`GET /api/orders/{id}` ya existe (`OrderController.get` → `OrderService.getOwned`) y no cambia de ruta ni de reglas de acceso. Se amplía `OrderResponse` con:

| Campo | Origen | Notas |
| --- | --- | --- |
| `customerName` | `users.first_name` + `last_name` del dueño | Solo el nombre; no expone teléfono ni correo. |
| `deliveryStatus` | `orders.delivery_status` | Ya existe (HU-25). |
| `address` | `{ label, text, reference }` copiados en `orders.address_*` | `null` con Recojo en tienda. |
| `purchasedAt` | `orders.created_at` | Fecha de compra. |
| `paidAt` | `orders.paid_at` | Fecha de pago; `null` en contraentrega hasta que se cobre (E6) y mientras el pedido en línea no esté pagado. |

El nombre y la dirección solo se incluyen cuando el pedido está confirmado (`isConfirmed()`), igual que `deliveryCode`; en un pedido pendiente o cancelado viajan `null`. `OrderResponse.from` recibe el nombre ya resuelto (el servicio carga el `User` que ya valida en `requireCustomer`, sin consulta extra).

### Correo de confirmación

**Disparo por evento.** El pedido pasa a confirmado en dos sitios distintos: `OrderLifecycleService.place` (contraentrega, nace en `PENDIENTE_COBRO`) y `PaymentSettlementService.settleApproved` (`order.markPaid()`). En ambos, dentro de su transacción, se publica un `OrderConfirmedEvent(orderId)` con `ApplicationEventPublisher`.

- Nuevo `OrderConfirmationListener` (paquete `pedidos`) con `@Async` + `@TransactionalEventListener(phase = AFTER_COMMIT)`: solo reacciona si la transacción que confirma el pedido se completó, y no bloquea la respuesta ni el aviso de Mercado Pago. `@EnableAsync` ya está en `common/config/AsyncConfig.java`.
- El listener abre su propia transacción corta (`@Transactional(REQUIRES_NEW)` en un método de `OrderConfirmationService`; un bean aparte para que el proxy aplique) que **reclama el envío**: `UPDATE orders SET confirmation_sent_at = now() WHERE id = :id AND confirmation_sent_at IS NULL` (método `@Modifying` en `OrderRepository`). Si afecta 0 filas, ya se envió o lo reclamó otro hilo: termina sin enviar. Con 1 fila, carga el pedido con sus platos y el usuario y llama al correo.
- **Un solo correo por pedido**: el `UPDATE` condicional es atómico en PostgreSQL, así que avisos repetidos de Mercado Pago (que además `settleApproved` ya ignora cuando el pago es conocido), dos hilos o un reinicio no duplican.
- **Falla del SMTP**: se captura y se registra (como `MailService.sendPasswordResetEmail`); el pedido ya está confirmado y la marca queda puesta, así que no hay reintento (decisión de la spec: sin cola de correos). Si se prefiere reintentar ante fallo, ver Decisiones.

**`MailService.sendOrderConfirmationEmail(to, firstName, OrderConfirmation data)`**: mismo patrón que el correo de recuperación (`ObjectProvider<JavaMailSender>`, `MimeMessageHelper`, remitente `app.mail.from`, HTML). Como el listener ya es asíncrono, el método no lleva `@Async` propio. Asunto: `Confirmación de tu pedido SAL-001042 - Salazar`.

- El cuerpo se arma en un método de paquete `buildOrderConfirmationBody` (testeable sin SMTP, como `buildPasswordResetBody`) con el mismo contenido que la pantalla: código de pedido y de entrega con su indicación, nombre, estados de pago y entrega, cómo recibe y paga, platos con importes, subtotal, delivery y total, fecha de compra y de pago (o "Pendiente, se paga al recibir").
- Todo texto de origen del cliente (nombre, etiqueta, dirección, referencia, nombres de platos) pasa por el `escape` que ya existe en `MailService`.
- Importes con formato `S/ 32.00` (`Locale` fijo, dos decimales) y fechas en hora de Lima, `America/Lima`, con el mismo formato que el frontend.
- Destinatario: siempre `users.email` del dueño del pedido, leído en el servidor.
- `common.mail` no debe depender de entidades de `pedidos` (ciclo entre paquetes): el servicio de confirmación arma un record `OrderConfirmationMail` con los datos ya formateados/planos y `MailService` solo lo renderiza.

### Base de datos

Migración `V13__order_confirmation_sent.sql`:

```sql
-- Set once the confirmation email has been claimed, so an order never sends it twice (HU-21).
ALTER TABLE orders ADD COLUMN confirmation_sent_at TIMESTAMPTZ;
```

Los pedidos anteriores quedan en `NULL`: no se les envía correo retroactivo porque solo se dispara con el evento de confirmación. Hibernate sigue en `validate`: se agrega el campo `confirmationSentAt` a `Order` sin setter público (solo lo toca el `UPDATE` condicional). Se usa el mismo tipo de columna que `paid_at` en `V10__orders.sql` (verificarlo al escribir la migración).

### Capas

- **`Order`**: campo `confirmationSentAt` (solo lectura para la aplicación).
- **`OrderRepository`**: `claimConfirmationEmail(id)` (`@Modifying @Query`, devuelve `int`) y una consulta del pedido con sus platos para el correo (`findByIdWithItems` si ya existe, o reutilizar `findByIdAndUserIdWithItems`).
- **`OrderLifecycleService.place`** y **`PaymentSettlementService.settleApproved`**: publican `OrderConfirmedEvent` (solo cuando el pedido realmente queda confirmado; no en el rechazo, el pago pendiente ni el aviso repetido).
- **`OrderConfirmationListener`** / **`OrderConfirmationService`**: ver arriba.
- **`MailService`**: nuevo método y plantilla.
- **`OrderService.getOwned`**: pasa el nombre del usuario y la dirección al DTO.
- **`SecurityConfig`**: sin cambios.

## Frontend

### Clientes de la API

Se actualizan las llamadas en `checkout-api.ts` (`/orders`, `/orders/{id}`, `/orders/delivery-cost` con `addressId`), `order-api.ts` (`/orders`), `address-api.ts` (`/profile/addresses`) y `profile-api.ts` (`/profile`, `/profile/password`). `lib/api.ts` tiene una regla que compara el inicio de la URL con `/perfil` (para no redirigir al login en ciertos errores de ese grupo): se cambia a `/profile`. Las rutas de pantallas del router no cambian.

### Pantalla de confirmación (`features/checkout`)

- **`checkout-api.ts`**: ampliar `Order` con `customerName`, `deliveryStatus` (`EN_PREPARACION | EN_CAMINO | ENTREGADO`), `address` (`{ label; text; reference } | null`), `purchasedAt` y `paidAt` (`string | null`, ISO).
- **`order-result-page.tsx`**: en las ramas `PAGADO` y `PENDIENTE_COBRO` se reemplaza el cuerpo mínimo por un componente común `OrderConfirmation` (mismos encabezados "Recibimos tu pago" / "Recibimos tu pedido"); los demás estados (confirmando, en proceso, no completado, no encontrado, carga, error) no se tocan. La limpieza del carrito y del store de checkout se queda como está.
- **`components/order-confirmation.tsx`** (nuevo): compone, en el orden de la spec, encabezado con "Enviamos la confirmación a …" (ver nota abajo), `OrderCodes` (existente), datos del pedido, entrega, pago, detalle y fechas, y las acciones **Ver mis pedidos** (`/perfil/mis-pedidos`) y **Seguir viendo la carta**.
- **Componentes pequeños por bloque** en `features/checkout/components/`: `order-summary-table.tsx` (platos, subtotal, delivery o "Recojo en tienda, sin costo", total) y `order-info-list.tsx` (nombre, estado del pago, estado de entrega, entrega, pago, fechas). `collectionSummary` pasa de `order-result-page.tsx` a un módulo reutilizable (`order-payment-text.ts`) para no duplicarlo.
- **Formato**: `formatPrice` (`features/catalogo/format`) para importes; nueva función `formatDateTime` para fecha y hora (`Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })`). Si `paidAt` es `null`: "Pendiente, se paga al recibir".
- **Etiquetas de estado**: pago → "Pagado" (`PAGADO`) o "Pago pendiente al recibir" (`PENDIENTE_COBRO`); entrega → "En preparación", "En camino", "Entregado". Reutilizar el mapa de etiquetas de entrega de `features/perfil` si ya existe (`delivery-progress.tsx`); si está embebido, extraerlo a un módulo compartido en vez de duplicarlo.
- **Correo en el encabezado**: `Order` no trae el correo; el texto "Enviamos la confirmación a …" usa el correo de la sesión (`AuthContext`, ya cargado en el cliente), sin pedirlo al endpoint del pedido.
- Design system: `Card`, `Button` y tokens existentes; el detalle usa tablas/listas con las utilities de Tailwind ya definidas. Sin tokens nuevos.

## Seguridad

- La pertenencia del pedido ya se verifica en la consulta (`findByIdAndUserIdWithItems`); no cambia. Pedido ajeno o inexistente: `404` sin revelar existencia.
- El destinatario del correo sale del `User` dueño del pedido en el servidor; ningún dato de la petición lo influye.
- Nombre, dirección y código de entrega solo viajan con el pedido confirmado.
- Escape de HTML de todo texto del cliente en el correo.
- El enlace o código de entrega del correo no aparece en logs: el log de fallo registra el id del pedido, no el cuerpo del mensaje.

## Decisiones

- **Evento `AFTER_COMMIT` + `UPDATE` condicional** en lugar de enviar inline en `place` o `settleApproved`: el correo nunca sale de una transacción revertida y la unicidad no depende de la lógica de estados.
- **Marca antes del envío (at-most-once)**: si el SMTP falla, no se reintenta. Evita duplicados y bloqueos por correos que rebotan; coherente con "Fuera de alcance: cola de correos". Si más adelante se quiere reintento, bastaría limpiar `confirmation_sent_at` en el `catch`, a costa de aceptar posibles duplicados.
- **Sin endpoint nuevo**: `GET /api/orders/{id}` ya consulta cada pocos segundos mientras el pedido está pendiente; los campos extra solo se pueblan con el pedido confirmado, sin costo para el polling.
- **Dos fechas con significado propio** (`created_at` = compra, `paid_at` = pago): HU-25 sigue con `COALESCE(paid_at, created_at)` para su historial.
- **Servicio de confirmación aparte** de `OrderService`: separa la parte transaccional del evento y evita que `OrderService` dependa de `MailService`.

## Impacto en docs/

- `AGENTS.md`: agregar a Convenciones que las rutas de la API van en inglés (las de pantallas del frontend, en español).
- `docs/diagrama-de-despliegue.md` y `docs/guia-de-despliegue.md`: URL del webhook `/api/payments/mercadopago/webhook`.
- `docs/diagrama-de-base-de-datos.md`: columna `confirmation_sent_at` en `orders`; regenerar `images/database-diagram.png` si el diagrama muestra las columnas.
- `docs/diagrama-de-arquitectura.md`: mencionar el correo de confirmación de pedidos entre los usos del servidor SMTP.
- `docs/historias.md` y `docs/cronograma.md`: estado de HU-21.
- `specs/hu-19-pago-en-linea/spec.md` y `specs/hu-20-pago-contraentrega/spec.md`: nota de que la confirmación completa ya se conecta con HU-21.
- `frontend/src/features/checkout/README.md`: pantalla de confirmación completa.
