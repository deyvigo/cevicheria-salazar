# Spec: HU-21 — Confirmar el pedido con su número y correo de confirmación

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: En implementación

## Objetivo

Que un Cliente con sesión iniciada, al terminar su compra (pago en línea aprobado o pedido contraentrega creado), vea una **confirmación completa** de su pedido (número, qué pidió, cómo lo recibirá y cuánto paga) y reciba el mismo detalle por **correo**, para tener constancia de su compra.

## Contexto (qué ya existe y qué falta)

- HU-19 y HU-20 crean los pedidos y llevan al cliente a `/checkout/resultado?pedido={id}`. Esa pantalla hoy solo muestra un título, el **código de pedido** (`SAL-001042`), el **código de entrega** y, con contraentrega, el medio de cobro. Ambas historias dejaron explícito que el detalle completo y el correo son de HU-21.
- La base de datos ya guarda todo lo necesario (`orders` y `order_items`): copia del nombre, precio y cantidad de cada plato, tipo de entrega, copia de la dirección (etiqueta, texto, referencia, zona), subtotal, delivery, total, medio de cobro y monto declarado. `GET` del pedido ya devuelve platos, importes, medio de cobro y vuelto, pero **no** la dirección ni las fechas (`created_at` y `paid_at` ya existen en `orders`).
- El backend ya sabe enviar correo (`MailService`, SMTP, usado en la recuperación de contraseña de HU-03), pero solo tiene la plantilla de ese correo.
- Un pedido queda **confirmado** (`PAGADO` o `PENDIENTE_COBRO`) en dos momentos distintos: al crearlo con contraentrega, o cuando el aviso verificado de Mercado Pago aprueba el pago en línea (`PaymentSettlementService`). El correo debe salir en ambos, una sola vez por pedido.
- HU-25 muestra el historial de pedidos con nombre, precio, fecha y etapa de entrega; **no** tiene vista de detalle. Esta historia no la agrega.
- Seguir el pedido (En preparación, En camino, Entregado) es HU-26; el panel de pedidos del administrador es E6.

## Actor(es)

- **Cliente** con sesión iniciada.
- **Servidor SMTP** (sistema externo): entrega el correo de confirmación.

## Pantalla de confirmación

Ruta existente `/checkout/resultado?pedido={id}`, con el indicador de pasos en **¡Listo!**. Cuando el pedido está confirmado (`PAGADO` o `PENDIENTE_COBRO`) deja de ser una pantalla mínima y muestra, en este orden:

1. **Encabezado**: "Recibimos tu pago" (en línea) o "Recibimos tu pedido" (contraentrega), con el **código de pedido** destacado y la indicación de que enviamos el detalle a su correo (`Enviamos la confirmación a ana@correo.com`).
2. **Códigos**: el código de pedido y el código de entrega con su indicación, como hoy.
3. **Datos del pedido**: **Nombre** del cliente (nombre y apellido de la cuenta), **estado del pago** ("Pagado" en línea; "Pago pendiente al recibir" en contraentrega) y **estado de la entrega** ("En preparación").
4. **Cómo lo recibirás**: **Entrega a domicilio** con la etiqueta, la dirección y la referencia de la dirección elegida, o **Recojo en tienda**.
5. **Cómo pagas**: **Pago en línea** (pagado), o contraentrega con el medio y, si corresponde, "Pagarás con S/ 100.00 (vuelto S/ 15.00)", como hoy.
6. **Detalle del pedido**: cada plato con su cantidad, precio unitario y subtotal de línea; luego **Subtotal**, **Delivery** (o "Recojo en tienda, sin costo") y **Total**, con formato `S/ 32.00`.
7. **Fecha de compra** (cuándo se creó el pedido) y **fecha de pago** (cuándo se cobró), ambas con fecha y hora. Con pago en línea el pago queda registrado cuando Mercado Pago lo aprueba, por lo que ambas fechas coinciden o quedan a pocos minutos; con contraentrega la fecha de pago aparece como "Pendiente, se paga al recibir" hasta que el pedido se cobre (E6).
8. Acciones: **Ver mis pedidos** (lleva a `/perfil/mis-pedidos`) y **Seguir viendo la carta**.

Los estados que no son de confirmación (confirmando el pago, pago en proceso, pago no completado, pedido no encontrado) no cambian: siguen siendo los de HU-19 y HU-22.

## Correo de confirmación

Se envía al correo de la cuenta del cliente cuando el pedido pasa a confirmado. Asunto: `Confirmación de tu pedido SAL-001042 - Salazar`. Contiene los mismos datos que la pantalla (código de pedido, código de entrega con su indicación, nombre del cliente, estados de pago y entrega, cómo lo recibirá, cómo paga, platos, importes y las fechas de compra y de pago), en español tuteando al cliente, sin emojis.

- Un pedido en línea solo genera correo cuando el pago está **aprobado**; el pedido pendiente de pago, rechazado o cancelado no envía nada.
- El envío no bloquea ni hace fallar la creación del pedido ni el procesamiento del aviso de pago: si el SMTP falla o no está configurado, el pedido queda igualmente confirmado, la pantalla se muestra igual y el fallo solo se registra.
- Cada pedido envía **un solo** correo de confirmación, aunque Mercado Pago repita el aviso, el cliente recargue la pantalla o el servidor reintente.

## Criterios de aceptación

### Confirmación en pantalla

- **Dado** un pedido con pago en línea aprobado, **cuando** llego a la pantalla de resultado, **entonces** veo "Recibimos tu pago" con el código de pedido, el código de entrega, cómo lo recibiré, cómo pagué, el detalle de platos con importes, la fecha de compra y la fecha de pago.
- **Dado** un pedido contraentrega creado, **cuando** llego a la pantalla de resultado, **entonces** veo "Recibimos tu pedido" con el mismo contenido y el medio de cobro con el que pagaré (y "Pagarás con S/ 100.00 (vuelto S/ 15.00)" con Efectivo y monto).
- **Dado** un pedido con **Entrega a domicilio**, **cuando** veo la confirmación, **entonces** aparece la dirección (etiqueta, texto y referencia) tal como se guardó al comprar y el delivery cobrado.
- **Dado** un pedido con **Recojo en tienda**, **cuando** veo la confirmación, **entonces** no aparece dirección, dice "Recojo en tienda" y el delivery figura como sin costo, y las indicaciones hablan de "al recoger".
- **Dado** que el precio de un plato o su nombre cambió después de mi compra, **cuando** abro la confirmación, **entonces** veo los datos de cuando compré, no los actuales.
- **Dado** la confirmación, **cuando** miro los datos del pedido, **entonces** veo mi nombre, el estado del pago y el estado de entrega "En preparación".
- **Dado** un pedido con pago en línea aprobado, **cuando** veo las fechas, **entonces** veo la fecha de compra y la fecha de pago (la de aprobación), con día y hora en hora de Lima.
- **Dado** un pedido contraentrega, **cuando** veo las fechas, **entonces** veo la fecha de compra y, en lugar de fecha de pago, "Pendiente, se paga al recibir".
- **Dado** la confirmación, **cuando** miro los importes, **entonces** el subtotal más el delivery es igual al total y todos usan el formato `S/ 32.00`.
- **Dado** la confirmación, **cuando** pulso "Ver mis pedidos", **entonces** voy a `/perfil/mis-pedidos` y veo mi pedido nuevo con estado "En preparación".
- **Dado** que recargo la pantalla de resultado o vuelvo a abrir su enlace, **cuando** carga, **entonces** veo la misma confirmación y no se envía otro correo.
- **Dado** un pedido que aún no está confirmado, **cuando** abro la pantalla, **entonces** no veo el detalle de confirmación ni el código de entrega (siguen los estados de HU-19 y HU-22).
- **Dado** el pedido de otro cliente o inexistente, **cuando** lo consulto, **entonces** veo que no se encontró, sin revelar si existe.
- **Dado** que la pantalla aún no recibió el pedido, **cuando** carga, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.

### Correo de confirmación

- **Dado** que creo un pedido contraentrega, **cuando** se guarda, **entonces** se envía un correo de confirmación a mi correo de cuenta con el detalle del pedido.
- **Dado** un pedido en línea pendiente de pago, **cuando** Mercado Pago avisa que el pago fue aprobado, **entonces** el pedido pasa a pagado y se envía el correo de confirmación.
- **Dado** un pedido en línea cuyo pago es rechazado, está pendiente o el pedido se cancela, **cuando** ocurre, **entonces** no se envía correo de confirmación.
- **Dado** que Mercado Pago repite el aviso de un pago ya procesado, **cuando** llega, **entonces** no se envía otro correo.
- **Dado** el correo recibido, **cuando** lo leo, **entonces** veo el código de pedido, el código de entrega con su indicación ("Díselo al repartidor al recibir tu pedido" o "al recoger"), mi nombre, los estados de pago y entrega, cómo recibiré y pagaré, los platos con importes, el total, la fecha de compra y la fecha de pago (o "Pendiente, se paga al recibir").
- **Dado** que el servidor SMTP falla o no está configurado, **cuando** se confirma un pedido, **entonces** el pedido se confirma igual, la pantalla funciona igual y el error se registra sin mostrar nada al cliente.
- **Dado** el contenido del correo, **cuando** incluye textos escritos por el cliente (nombre, referencia de la dirección), **entonces** se escapan para que no puedan inyectar HTML.

### Seguridad

- **Dado** cualquier llamada para ver un pedido sin sesión de Cliente, **cuando** llega al backend, **entonces** se rechaza (`401`/`403`), y un cliente solo ve sus propios pedidos.
- **Dado** un pedido no confirmado, **cuando** se consulta, **entonces** la respuesta no incluye el código de entrega (regla de HU-19, sin cambios).
- **Dado** el correo, **cuando** se envía, **entonces** va únicamente al correo de la cuenta dueña del pedido, nunca a una dirección recibida en la petición.

## Casos borde

- **Pedido en línea que se aprueba cuando el cliente ya cerró la página** (o nunca volvió de Mercado Pago): el correo sale igual, porque lo dispara el aviso verificado y no la pantalla.
- **Aviso de pago aprobado sobre un pedido ya vencido o cancelado**: se mantiene lo que decida HU-19 para ese caso; solo se envía correo si el pedido termina confirmado.
- **Pantalla vista antes de que llegue el aviso de pago**: muestra "Estamos confirmando tu pago" (HU-19) y pasa a la confirmación completa en cuanto el pedido queda pagado.
- **Cuenta sin correo utilizable** o correo rebotado: no hay reintento visible; el cliente conserva la confirmación en pantalla.
- **Pedido con muchos platos o notas largas**: el detalle los muestra todos sin cortar la lectura; el correo mantiene el mismo detalle.
- **Cliente que cambia su correo de cuenta después de comprar** (HU-23): el correo ya enviado no se reenvía; solo se usa el correo vigente al momento de confirmarse.
- **Administrador** que abre estas rutas: se rechaza (el checkout es de Cliente).

## Rutas de la API en inglés

Las rutas de la API van en inglés. Hoy las de administración (`/api/admin/...`), catálogo y autenticación ya lo están; esta historia renombra las que quedaban en español, sin cambiar su comportamiento ni sus respuestas:

| Antes | Después |
| --- | --- |
| `/api/pedidos` | `/api/orders` |
| `/api/pedidos/costo-delivery` (parámetro `direccionId`) | `/api/orders/delivery-cost` (parámetro `addressId`) |
| `/api/pagos/mercadopago/webhook` | `/api/payments/mercadopago/webhook` |
| `/api/perfil` y `/api/perfil/contrasena` | `/api/profile` y `/api/profile/password` |
| `/api/perfil/direcciones` | `/api/profile/addresses` |

Las rutas de **pantallas** del frontend (`/perfil`, `/perfil/mis-pedidos`, `/checkout/resultado`) siguen en español: son parte de la interfaz, no de la API.

## Fuera de alcance

- Cambiar nombres de campos, códigos de error o el comportamiento de los endpoints renombrados: solo cambian las rutas.
- Notas por plato (por ejemplo "sin ají", HU-15): no existen en el checkout y agregarlas obliga a modificar el carrito y la creación del pedido; si HU-15 se implementa, se suman a la confirmación en ese cambio.
- Teléfono y correo del cliente dentro de la confirmación en pantalla: solo se muestra el nombre (el correo aparece únicamente como destino del envío).
- Imagen de los platos, zona de delivery, hora estimada y datos de contacto de la tienda.
- Vista de detalle de un pedido desde el historial del perfil (E5): aquí solo se ve el detalle en la confirmación y en el correo.
- Seguimiento del estado de entrega y avisos de cambio de estado (HU-26, E6).
- Reenviar el correo de confirmación a demanda.
- Descargar o imprimir un comprobante o boleta electrónica.
- Correo al negocio o al administrador por cada pedido nuevo (E6).
- Pago rechazado y su correo o aviso (HU-22).
- Diseño del correo con imágenes, logotipo o estilos elaborados: texto HTML sencillo, legible en cualquier cliente de correo.
- Cola persistente de correos con reintentos.
- Layout para celular, igual que el resto del checkout.

## Impacto en documentación

- `docs/diagrama-de-arquitectura.md`: el servidor SMTP ya figura; confirmar que se mencione el correo de confirmación de pedidos.
- `docs/diagrama-de-base-de-datos.md` (+ imagen): columna `confirmation_sent_at` en `orders`. Requiere migración de base de datos (Flyway).
- `docs/diagrama-de-despliegue.md` y `docs/guia-de-despliegue.md`: nueva URL del webhook de Mercado Pago (`/api/payments/mercadopago/webhook`), que también debe actualizarse en el panel de Mercado Pago.
- `AGENTS.md`: convención de que las rutas de la API van en inglés.
- `docs/historias.md` y `docs/cronograma.md`: estado de HU-21.
- `specs/hu-19-pago-en-linea/spec.md` y `specs/hu-20-pago-contraentrega/spec.md`: nota de que la confirmación completa ya se conecta con esta historia.
- `frontend/src/features/checkout/README.md`: pantalla de confirmación completa.

## Decisiones de clarificación

- **Un solo correo por pedido**: columna `confirmation_sent_at` en `orders` (migración Flyway), marcada de forma atómica al enviar; sobrevive a avisos repetidos y reinicios.
- **Respuesta del pedido**: se amplía `GET /api/orders/{id}` con dirección, nombre del cliente, estado de entrega, fecha de compra y fecha de pago; no hay endpoint nuevo.
- **Fecha de compra y fecha de pago**: son dos datos distintos. La **fecha de compra** es `created_at` (cuándo se creó el pedido) y la **fecha de pago** es `paid_at` (cuándo se cobró: la aprobación de Mercado Pago en línea; vacía en contraentrega hasta que el administrador marque el cobro, E6). Se muestran en hora de Lima. Esta definición aplica a la confirmación y al correo; el historial de HU-25 mantiene la suya.
- **Código de entrega en el correo**: sí se incluye; va solo al correo de la cuenta dueña del pedido y solo con el pedido confirmado.
- **Momento del envío**: asíncrono y solo después de que la transacción que confirma el pedido se complete.
- **Saludo**: con el nombre de pila del cliente (`Hola Ana,`), como el correo de recuperación de contraseña.
- **Rutas de la API**: en inglés; se renombran en esta misma historia las que estaban en español (ver sección "Rutas de la API en inglés"). Las specs anteriores (HU-17 a HU-25) conservan las rutas con las que se construyeron.
- **Información adicional**: se agregan nombre del cliente, estado del pago y estado de entrega; la dirección de entrega ya estaba incluida; las notas por plato se omiten.

## Preguntas abiertas

Ninguna.
