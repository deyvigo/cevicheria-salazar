# Spec: HU-19 — Pagar en línea con Mercado Pago

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada que eligió **Pago en línea** pague su pedido en la pasarela de **Mercado Pago** y, una vez aprobado el pago, su pedido quede registrado como pagado.

## Contexto (qué ya existe y qué falta)

- HU-18 entrega el paso Pago (`/checkout/pago`) con la elección entre Pago en línea y Contraentrega, y deja "Continuar" deshabilitado esperando esta historia y HU-20.
- HU-17 calcula el delivery en el servidor y dejó dicho que al crear el pedido el backend **recalcula** subtotal, delivery y total sin confiar en lo que muestra el frontend.
- El carrito vive solo en el navegador (`localStorage`); el backend no lo conoce.
- **No existen** pedidos ni pagos en el backend: esta historia crea las tablas de pedidos y pagos (HU-21 las reutiliza para la confirmación).
- La pasarela es **Mercado Pago**, no Izipay como figura hoy en `docs/`, `AGENTS.md` y `backend/.env.example`; esta historia actualiza esos documentos.

## Actor(es)

- **Cliente** con sesión iniciada.
- **Mercado Pago** (sistema externo): recibe al cliente para cobrar y avisa a la API el resultado del pago.

## Cómo funciona (visión de producto)

Se usa **Checkout Pro**: el cliente sale de la aplicación a una página de Mercado Pago, paga allí y vuelve. La aplicación nunca ve ni guarda datos de tarjeta, y el cliente **no necesita una cuenta de Mercado Pago** para pagar (puede hacerlo como invitado). Los medios de pago disponibles (tarjetas, Yape, efectivo, etc.) los define la cuenta de Mercado Pago del negocio, no esta aplicación.

1. En el paso Pago, con **Pago en línea** elegido, el cliente pulsa **Pagar**.
2. El backend crea el pedido en estado **pendiente de pago**, reserva el stock y pide a Mercado Pago una orden de pago.
3. La aplicación lleva al cliente a Mercado Pago.
4. El cliente paga y Mercado Pago lo devuelve a la aplicación, a una pantalla de resultado.
5. Por separado, Mercado Pago avisa a la API del resultado; solo ese aviso verificado marca el pedido como pagado.

## Códigos del pedido

Cada pedido guarda **dos códigos**, generados por el backend al crearlo:

- **Código de pedido** (`SAL-001042`): identifica el pedido de forma legible para el cliente, el negocio y el soporte. Es único y correlativo.
- **Código de entrega** (4 dígitos, por ejemplo `4827`): lo dice el cliente al repartidor (o en tienda, con Recojo) para **confirmar que es el dueño del pedido** al recibirlo. Lo genera el servidor de forma aleatoria y no se deduce del código de pedido.

El cliente ve ambos códigos en la pantalla de resultado cuando el pedido está **pagado** (y HU-21 los mostrará en la confirmación). El código de entrega no se muestra en ninguna otra pantalla, correo previo al pago ni URL, y solo lo ve el dueño del pedido. Verificar el código al entregar y marcar el pedido como entregado es del panel de administración (E6), fuera de esta historia.

## Pantalla del paso Pago (cambios sobre HU-18)

- Con **Pago en línea** seleccionado, el botón principal pasa a llamarse **Pagar** y muestra el total (`Pagar S/ 85.00`); queda habilitado.
- Con **Contraentrega** o sin selección sigue deshabilitado (HU-20 lo conecta).
- Al pulsar, el botón se deshabilita y muestra un estado de carga hasta que el cliente es llevado a Mercado Pago, para evitar pedidos duplicados por doble clic.
- Si el backend rechaza la creación (stock agotado, plato no disponible, dirección sin cobertura, error de Mercado Pago), el cliente permanece en el paso Pago y ve un aviso de error abajo a la derecha, con la misma duración que el resto de notificaciones de la aplicación, y puede reintentar o volver.

## Pantalla de resultado

Ruta `/checkout/resultado?pedido={id}`, a la que Mercado Pago devuelve al cliente. Muestra el indicador de pasos con **¡Listo!** resaltado y consulta al backend el estado real del pedido (no se fía de lo que traiga la URL).

- **Pagado**: "Recibimos tu pago" con el **código de pedido** y el **código de entrega** (con la indicación "Díselo al repartidor al recibir tu pedido", o "al recoger" con Recojo); el carrito del cliente se vacía. El detalle completo y el correo de confirmación son de HU-21.
- **Pendiente** (el aviso de Mercado Pago aún no llegó, o el medio de pago tarda, como el efectivo): "Estamos confirmando tu pago". La pantalla consulta el estado cada pocos segundos durante un tiempo acotado y, si no se resuelve, indica que le avisaremos y deja ver el pedido; el carrito no se vacía hasta que el pedido esté pagado.
- **Rechazado o cancelado**: mensaje de que el pago no se completó, con un enlace para volver al carrito y reintentar (el estado del checkout se pierde al salir hacia Mercado Pago, por lo que no se puede volver directo al paso Pago). Se muestra con el pedido cancelado o con el último pago rechazado. El mensaje detallado y cambiar de método son de HU-22.

## Criterios de aceptación

### Iniciar el pago

- **Dado** un cliente en el paso Pago con **Pago en línea** elegido, **cuando** pulsa "Pagar", **entonces** se crea un pedido pendiente de pago con los platos del carrito y es llevado a Mercado Pago.
- **Dado** un cliente con **Contraentrega** elegido o sin método elegido, **cuando** mira el botón principal, **entonces** sigue deshabilitado.
- **Dado** que pulsé "Pagar", **cuando** espero la respuesta, **entonces** el botón está deshabilitado y en carga, y un segundo clic no crea otro pedido.
- **Dado** que el backend rechaza la creación del pedido, **cuando** ocurre, **entonces** me quedo en el paso Pago con un mensaje (el del servidor si es de stock, disponibilidad o cobertura, o uno general) y puedo reintentar con el mismo botón o volver.
- **Dado** que el carrito cambió de contenido en otra pestaña, **cuando** pulso "Pagar", **entonces** se usa el carrito vigente al momento de pagar.

### Códigos

- **Dado** un pedido que se crea, **cuando** se guarda, **entonces** recibe un código de pedido único con formato `SAL-` y seis dígitos, correlativo, y un código de entrega de cuatro dígitos aleatorio.
- **Dado** dos pedidos distintos, **cuando** se crean, **entonces** nunca comparten código de pedido (pueden coincidir en código de entrega, que solo sirve junto con su pedido).
- **Dado** un pedido pagado mío, **cuando** veo el resultado, **entonces** veo su código de pedido y su código de entrega.
- **Dado** un pedido que aún no está pagado, **cuando** consulto su estado, **entonces** la respuesta no incluye el código de entrega.
- **Dado** el pedido de otro cliente, **cuando** lo consulto, **entonces** no veo ninguno de sus códigos.

### Validación en el servidor

- **Dado** un pedido en creación, **cuando** el backend lo procesa, **entonces** recalcula precios, subtotal, delivery (con las zonas activas de HU-17) y total desde los datos de la base, sin aceptar importes del cliente.
- **Dado** un plato inactivo, eliminado, no disponible o con stock menor que la cantidad pedida, **cuando** se crea el pedido, **entonces** se rechaza indicando qué plato falla, y no se crea pedido ni se toca el stock.
- **Dado** una dirección ajena, eliminada o fuera de cobertura, **cuando** se crea el pedido, **entonces** se rechaza.
- **Dado** que elijo Recojo en tienda, **cuando** se crea el pedido, **entonces** el delivery es `S/ 0.00` y no se exige dirección.
- **Dado** un pedido creado, **cuando** se guarda, **entonces** conserva una copia de los precios, nombres y cantidades de cada plato y de la dirección o el recojo, de modo que cambios posteriores en el catálogo no alteran el pedido.
- **Dado** el pedido pendiente de pago, **cuando** se crea, **entonces** descuenta el stock de cada plato (reserva) para que dos clientes no paguen el último plato.

### Pasarela

- **Dado** un pedido pendiente, **cuando** el backend pide la orden de pago a Mercado Pago, **entonces** la solicitud lleva los platos y el delivery con sus importes en soles, el identificador del pedido como referencia externa, la dirección para el aviso, las direcciones de retorno a `/checkout/resultado` y un vencimiento.
- **Dado** que Mercado Pago no responde o devuelve un error al crear la orden, **cuando** ocurre, **entonces** el pedido se cancela, el stock se libera y el cliente ve un mensaje con la opción de reintentar.
- **Dado** que estoy en Mercado Pago, **cuando** pago, **entonces** puedo hacerlo como invitado, sin cuenta de Mercado Pago.
- **Dado** el cliente en Mercado Pago, **cuando** decide no pagar y vuelve, **entonces** regresa a la aplicación sin que se pierda su carrito.
- **Dado** un pago rechazado dentro de Mercado Pago, **cuando** el cliente reintenta con otro medio en la misma página, **entonces** puede completar el pago, porque el pedido sigue pendiente hasta vencer.

### Aviso de Mercado Pago y estado del pedido

- **Dado** un aviso de pago de Mercado Pago, **cuando** llega a la API, **entonces** se verifica su firma y se consulta a Mercado Pago el detalle del pago; solo así se actualiza el pedido. Un aviso sin firma válida se ignora sin cambiar nada.
- **Dado** un pago aprobado cuyo importe y referencia coinciden con el pedido, **cuando** se procesa, **entonces** el pedido pasa a **pagado** y se guarda el pago.
- **Dado** un pago aprobado cuyo importe no coincide con el total del pedido, **cuando** se procesa, **entonces** el pedido no se marca como pagado y queda registrado para revisión.
- **Dado** que Mercado Pago envía el mismo aviso varias veces, **cuando** llegan, **entonces** el resultado es el mismo que con uno solo (no se duplica el pago ni cambia un pedido ya pagado).
- **Dado** un pago rechazado o cancelado, **cuando** llega el aviso, **entonces** se registra el intento pero el pedido **sigue pendiente** hasta que se pague o venza, para que el cliente pueda reintentar en Mercado Pago sin perder su reserva.
- **Dado** un pedido pendiente que supera el tiempo de vencimiento sin pago, **cuando** pasa ese tiempo, **entonces** se cancela automáticamente y el stock se libera.
- **Dado** un pago que se aprueba después de que el pedido venció, **cuando** llega el aviso, **entonces** se registra para revisión y no se reactiva el pedido de forma automática.

### Resultado

- **Dado** que vuelvo de Mercado Pago con el pedido ya pagado, **cuando** se muestra el resultado, **entonces** veo "Recibimos tu pago" con el código de pedido y el código de entrega, y mi carrito queda vacío.
- **Dado** que vuelvo antes de que llegue el aviso, **cuando** se muestra el resultado, **entonces** veo "Estamos confirmando tu pago", la pantalla se actualiza sola cuando el pedido cambia de estado y mi carrito sigue intacto hasta entonces.
- **Dado** que vuelvo con el pedido cancelado o con su último pago rechazado, **cuando** se muestra el resultado, **entonces** veo que el pago no se completó y puedo volver al carrito.
- **Dado** que abro `/checkout/resultado?pedido=` con el id de un pedido de otro cliente o inexistente, **cuando** carga, **entonces** veo que no se encontró el pedido, sin revelar si existe.
- **Dado** que abro `/checkout/resultado` sin sesión, **cuando** carga, **entonces** soy llevado a iniciar sesión.
- **Dado** que recargo `/checkout/resultado?pedido={id}`, **cuando** carga, **entonces** se muestra el estado actual del pedido (a diferencia de los pasos anteriores, esta ruta no redirige al carrito al recargar).

### Seguridad

- **Dado** cualquier llamada al backend, **cuando** viene sin sesión de Cliente, **entonces** se rechaza (`401`/`403`), y un cliente solo puede ver o pagar sus propios pedidos.
- **Dado** la aplicación en el navegador, **cuando** se inspecciona su código y sus peticiones, **entonces** no contiene credenciales de Mercado Pago ni datos de tarjeta; la integración vive solo en el backend.

## Casos borde

- **Cierre de la pestaña en Mercado Pago**: el pedido queda pendiente y vence solo; el carrito se conserva.
- **Reintento mientras hay un pedido pendiente**: al pulsar "Pagar" de nuevo, el pedido pendiente anterior del cliente se cancela y su stock se libera antes de crear el nuevo, para no dejar reservas dobles.
- **Aviso antes que el retorno** (lo habitual) y **retorno antes que el aviso**: ambos órdenes terminan en el mismo estado.
- **Medios de pago diferidos** (por ejemplo, efectivo en un agente): el pago queda pendiente más tiempo que un pago con tarjeta; ver Preguntas abiertas.
- **Doble compra del último plato**: gana quien reserva primero; el otro recibe el rechazo de stock al pulsar "Pagar".
- **Sesión que expira** estando en Mercado Pago: al volver, el cliente inicia sesión y llega a su resultado; el pago ya registrado por el aviso no depende de la sesión.
- **Mercado Pago caído** al crear la orden: se trata como error de creación (el pedido no queda pendiente).
- **Código de entrega repetido** entre pedidos: es válido; solo identifica al dueño junto con el código de pedido.
- **Cliente modifica el `id` en la URL de retorno**: solo ve pedidos propios.
- **Administrador** que llega a estas rutas: se rechaza (el checkout es de Cliente).

## Fuera de alcance

- Contraentrega y su detalle (efectivo, POS, Yape) — HU-20.
- Pantalla de confirmación completa con detalle del pedido y el correo — HU-21.
- Mensaje de pago rechazado con causa, reintentar con otro medio o cambiar a contraentrega — HU-22.
- Reembolsos, devoluciones y contracargos.
- Guardar tarjetas del cliente: no aplica con Checkout Pro, los datos de pago los maneja Mercado Pago.
- Cobro en otra moneda, cuotas configurables, descuentos y cupones.
- Verificar el código de entrega y marcar el pedido como entregado (panel de administración, E6).
- Ver el estado de los pedidos desde el perfil (E5) y gestionarlos como administrador (E6).
- Layout para celular, igual que el resto del checkout.

## Impacto en documentación

- **Reemplazo de Izipay por Mercado Pago** en `AGENTS.md`, `README.md`, `docs/diagrama-de-arquitectura.md`, `docs/diagrama-de-despliegue.md` (y su imagen si corresponde), `docs/diagrama-de-casos-de-uso.md`, `docs/guia-de-despliegue.md`, `backend/.env.example` (variables de Mercado Pago en lugar de `IZIPAY_*`) y las menciones en `specs/ht-09-entorno/`.
- `docs/diagrama-de-base-de-datos.md` (+ imagen): tablas de pedidos (con el código de pedido y el código de entrega), detalle de pedido y pagos.
- `docs/diagrama-de-arquitectura.md`: el aviso (webhook) de Mercado Pago entra por la API y el flujo de pago.
- `docs/guia-de-despliegue.md`: el aviso necesita una URL pública con HTTPS y las credenciales en el VPS.
- `docs/historias.md` y `docs/cronograma.md`: estado de HU-19.
- `specs/hu-18-metodo-de-pago/spec.md`: nota de que "Continuar" ya se conecta con el pago en línea.
- `frontend/src/features/checkout/README.md`: pantalla de resultado.

## Decisiones de clarificación

- **Vencimiento**: el cliente tiene **30 minutos** para pagar; pasado ese tiempo el pedido se cancela y se libera el stock.
- **Solo pagos inmediatos**: se excluyen los medios diferidos (efectivo en agente y similares), porque un pedido de comida no puede esperar horas a un pago.
- **Reserva de stock**: se descuenta al crear el pedido pendiente y se libera si se cancela o vence.
- **Carrito**: se vacía solo cuando el pedido está pagado, no al salir hacia la pasarela.
- **Pago aprobado fuera de tiempo** (pedido ya vencido o cancelado): no se reactiva solo; se registra para revisión del administrador y el reembolso se gestiona a mano desde Mercado Pago.
- **Pruebas y operación**: en desarrollo, credenciales y usuarios de prueba de Mercado Pago más una URL pública temporal (túnel) para los avisos; en producción, la cuenta del negocio con la URL pública del VPS. Salazar SAC debe crear su cuenta y confirmar los medios de pago que habilita.
- **Códigos**: el código de pedido es legible y correlativo (`SAL-001042`) y reemplaza al id interno como identificador visible; el código de entrega son 4 dígitos aleatorios que se guardan tal cual (a diferencia de los tokens de sesión, hay que poder mostrárselo de nuevo al cliente) y solo los ve el dueño del pedido ya pagado.
- **La URL de resultado usa el id interno** del pedido, no el código, y solo el dueño puede abrirla.

- **Un pago rechazado no cancela el pedido** (ajuste al implementar): con Checkout Pro el cliente puede reintentar con otro medio dentro de Mercado Pago con la misma preferencia; cancelar al primer rechazo dejaría un pago aprobado posterior sobre un pedido cancelado. El pedido vence por tiempo, y la pantalla de resultado trata un último pago rechazado como "no se completó".
- **Volver al carrito, no al paso Pago**, desde el resultado fallido: salir a Mercado Pago recarga la aplicación y el estado del checkout (en memoria) se pierde.
- **Sin datos del pagador en la preferencia** (ajuste al probar): no se envían el correo ni el nombre del cliente a Mercado Pago, que los pide en su propia página. Con credenciales de prueba, un correo que ya tiene cuenta real en Mercado Pago hace que se rechace el pago con "una de las partes es de prueba".
- **Pruebas con usuarios de prueba**: con credenciales de prueba, el pago se aprueba solo si se inicia sesión en Mercado Pago con un usuario **comprador** de prueba (distinto del vendedor) y se usa una tarjeta de prueba con titular `APRO`; pagar como invitado fue rechazado.
- **Mensajes de error del pedido**: el servidor responde `409` con el nombre del plato (sin stock, no disponible), `422` sin cobertura y `502` si Mercado Pago falla, todos con un mensaje en español para el cliente.

## Pendiente de verificar tras el despliegue

La historia se cerró con las pruebas automáticas en verde y el pago probado en local hasta Mercado Pago. Faltan estas comprobaciones, que requieren el backend publicado (Mercado Pago no alcanza `localhost`) y que se hacen con credenciales de prueba y luego con la cuenta real:

- **Configuración**: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y `APP_PUBLIC_API_URL` (`https://api.deyvigo.online`) en el `.env` del VPS; webhook del panel con la URL `https://api.deyvigo.online/api/pagos/mercadopago/webhook`, evento "Pagos" (`payment`) y la clave secreta igual a `MP_WEBHOOK_SECRET`; migración `V10` aplicada al arrancar.
- **Pago aprobado de punta a punta**: pagar con un comprador de prueba y la tarjeta con titular `APRO`; el webhook responde `200` (visible en "Notificaciones enviadas" del panel), el pedido pasa a `PAGADO` y la pantalla de resultado muestra "Recibimos tu pago" con el código de pedido y el de entrega, y el carrito se vacía.
- **Vuelta automática**: con la URL `https` el botón de Mercado Pago devuelve solo al cliente a `/checkout/resultado` (`auto_return`).
- **Pago rechazado** (titular `OTHE`): el pedido sigue pendiente, el cliente puede reintentar con otro medio, y la pantalla de resultado no dice que pagó.
- **Cancelar y volver sin pagar**: el resultado muestra "Estamos confirmando tu pago" y luego "Tu pago sigue en proceso"; el pedido vence a los 30 minutos y repone el stock.
- **Firma del webhook**: un aviso sin firma o con firma alterada responde `401` y no cambia nada; el mismo aviso reenviado desde el panel no duplica el pago.
- **Importe distinto**: un pago con importe distinto queda marcado para revisión sin pasar el pedido a `PAGADO`.
- **Casos borde con el servicio publicado**: dejar vencer el pedido con la pestaña cerrada, reintentar con un pedido pendiente (el anterior se cancela), pagar el último plato desde dos cuentas, abrir el resultado de otro cliente (`404`), Recojo en tienda (la indicación dice "al recoger").
- **Pago aprobado tras vencer el pedido**: queda registrado para revisión y el pedido no se reactiva.
- **Accesibilidad**: teclado y lector de pantalla en el botón "Pagar", los estados del resultado y la lectura de los códigos.
- **Cuenta real**: al pasar a producción, cambiar a las credenciales de producción y hacer un pago real de monto mínimo; confirmar con el negocio los medios de pago habilitados.

## Preguntas abiertas

Ninguna.
