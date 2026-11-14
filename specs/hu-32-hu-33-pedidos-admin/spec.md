# Spec: HU-32 y HU-33 — Ver pedidos entrantes en tiempo real y cambiar su estado

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: En implementación

## Objetivo

Que el Administrador vea en la sección **Pedidos** del panel los pedidos comprados, que la lista se actualice sola cuando entra un pedido o cambia uno (HU-32), y que pueda avanzar la etapa de entrega de cada pedido para que el cliente vea su avance (HU-33). Ambas historias comparten pantalla, endpoint y canal de tiempo real, por eso van en una sola spec y una sola rama.

## Contexto (qué ya existe y qué falta)

- El panel (HU-28) ya tiene la sección **Pedidos** en la navegación vertical (`/admin/pedidos`), hoy sin contenido.
- Los pedidos y sus platos existen (`orders`, `order_items`; HU-19, HU-20) y la etapa de entrega ya existe en `orders.delivery_status` (`EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`; HU-25). El cliente ya la ve en "Mis pedidos"; esta historia agrega quién la cambia.
- `orders.status` solo describe el pago y no se modifica aquí.
- El panel ya tiene tablas paginadas (`Pagination`) para platos y categorías.

## Actor(es)

Administrador con sesión iniciada. Los clientes no acceden a `/admin`.

## Criterios de aceptación

### Navegación y acceso (HU-32)

- **Dado** que soy Administrador, **cuando** abro `/admin/pedidos`, **entonces** veo la tabla de pedidos; recargar conserva la pestaña, los filtros, el orden y la página (todo en la URL).
- **Dado** que no tengo sesión o no soy Administrador, **cuando** intento abrir la pestaña o pedir los pedidos, **entonces** soy llevado a iniciar sesión o el servidor responde 401/403, según el caso, igual que el resto del panel (HU-28).

### Qué pedidos aparecen (HU-32)

- **Dado** pedidos en distintos estados de pago, **cuando** miro la tabla, **entonces** solo aparecen los comprados (`PAGADO` o `PENDIENTE_COBRO`); nunca `PENDIENTE_PAGO` ni `CANCELADO`.
- **Dado** que un pedido pendiente de pago se aprueba, **cuando** pasa a comprado, **entonces** aparece en la tabla (sin recargar, ver tiempo real) con estado de entrega "En preparación".

### Columnas de la tabla (HU-32)

- **Dado** la tabla, **cuando** la miro, **entonces** cada fila muestra solo: **Código** (`SAL-001042`), **Fecha** (de compra, hora de Lima, formato "7 nov 2026, 14:32"), **Cliente** (nombre y apellido), **Tipo** (Entrega o Recojo), **Zona** (nombre de la zona; "—" en Recojo), **Pago** (Online, Efectivo o Yape), **Estado de pago** (Pagado o Por cobrar), **Total** (`S/ 32.00`), **Estado de entrega** y la **acción** de cambio de estado.
- **Dado** un pedido con contraentrega en efectivo y monto indicado, **cuando** miro su fila, **entonces** la columna Pago muestra "Efectivo" y el vuelto a llevar (`Vuelto S/ 8.00`, calculado como monto menos total), para que el repartidor salga preparado.
- **Dado** que no hay pedidos que cumplan los filtros, **cuando** miro la tabla, **entonces** veo un estado vacío ("No hay pedidos con estos filtros", o "No hay pedidos activos" con la vista por defecto); durante la carga veo un estado de carga y, si falla, un mensaje con opción de reintentar.

### Ordenamiento (HU-32)

- **Dado** que abro la pestaña, **cuando** no he elegido otro orden, **entonces** los pedidos aparecen por **fecha de compra, del más reciente al más antiguo**.
- **Dado** los encabezados **Código**, **Fecha**, **Cliente**, **Zona**, **Total** y **Estado de entrega**, **cuando** hago clic en uno, **entonces** la tabla se ordena por esa columna en ascendente, y un segundo clic la invierte; el encabezado indica la dirección actual y solo hay una columna de orden activa a la vez.
- **Dado** que ordeno por **Estado de entrega**, **cuando** miro el resultado, **entonces** el orden es el del flujo (En preparación, En camino, Entregado), no alfabético.
- **Dado** que ordeno por **Zona**, **cuando** miro el resultado, **entonces** el orden es alfabético y los pedidos de Recojo (sin zona) van al final en ambos sentidos.
- **Dado** que hay empates en la columna de orden, **cuando** se pagina, **entonces** el desempate es por fecha descendente y luego por id descendente, para que el orden sea estable entre páginas.
- **Dado** los encabezados **Tipo**, **Pago** y **Estado de pago**, **cuando** los miro, **entonces** no son ordenables (se usan como filtros).

### Filtros y búsqueda (HU-32)

- **Dado** el campo de búsqueda, **cuando** escribo, **entonces** la tabla se limita a los pedidos cuyo **código** (con o sin el prefijo `SAL-` y sin ceros a la izquierda) o cuyo **nombre de cliente** coincide parcialmente, sin distinguir mayúsculas ni tildes; la búsqueda se aplica tras una breve pausa al escribir.
- **Dado** el filtro **Estado de entrega**, **cuando** lo uso, **entonces** puedo elegir "Activos" (En preparación y En camino; **valor por defecto**), "En preparación", "En camino", "Entregado" o "Todos".
- **Dado** los filtros **Tipo** (Todos, Entrega, Recojo), **Pago** (Todos, Online, Efectivo, Yape), **Estado de pago** (Todos, Pagado, Por cobrar) y **Zona** (Todas o una de las zonas existentes), **cuando** los combino, **entonces** la tabla aplica todos a la vez (Y lógico) junto con la búsqueda.
- **Dado** el filtro **Fecha**, **cuando** lo uso, **entonces** puedo elegir "Hoy", "Ayer", "Últimos 7 días", "Todas" (**por defecto**) o "Personalizado", que muestra dos campos de fecha (**Desde** y **Hasta**, ambos inclusive y opcionales: con uno solo el rango queda abierto del otro lado); los días se cuentan en hora de Lima y se comparan contra la fecha de compra.
- **Dado** un rango personalizado en el que **Desde** es posterior a **Hasta**, **cuando** intento aplicarlo, **entonces** veo un mensaje de error en los campos y la tabla conserva el filtro anterior.
- **Dado** que cambio cualquier filtro, la búsqueda o el orden, **cuando** se aplica, **entonces** la tabla vuelve a la página 1.
- **Dado** que hay algún filtro distinto del valor por defecto, **cuando** miro los filtros, **entonces** hay una acción "Limpiar filtros" que los restablece.

### Paginación (HU-32)

- **Dado** más de 20 pedidos que cumplen los filtros, **cuando** miro la tabla, **entonces** veo 20 por página con `Pagination`; `?page=N` va en la URL; con 20 o menos no se muestra.
- **Dado** que la página pedida ya no existe o es inválida, **cuando** abro la pestaña, **entonces** se muestra la última página existente (o la primera si el valor no es un entero positivo).
- **Dado** que la tabla muestra el total, **cuando** la miro, **entonces** indica cuántos pedidos cumplen los filtros (por ejemplo "37 pedidos").

### Tiempo real (HU-32)

- **Dado** que tengo `/admin/pedidos` abierto, **cuando** entra un pedido comprado o cambia el estado de uno, **entonces** la tabla se actualiza sola, sin recargar, respetando filtros, orden y página actuales.
- **Dado** que estoy en la **página 1 con el orden por defecto**, **cuando** entra un pedido nuevo que cumple los filtros, **entonces** aparece arriba sin más acciones.
- **Dado** que estoy en otra página, con otro orden o leyendo la tabla con un orden distinto al de fecha, **cuando** entra un pedido nuevo que cumple los filtros, **entonces** la tabla no se reordena sola: veo un aviso "N pedidos nuevos" con una acción para actualizar y volver al orden por defecto, página 1.
- **Dado** que cambia el estado de un pedido que estoy viendo, **cuando** llega el aviso, **entonces** su fila se actualiza en su lugar aunque deje de cumplir el filtro (por ejemplo pasa a Entregado con el filtro "Activos"); en ese caso desaparece al siguiente refresco, no mientras el administrador la está operando.
- **Dado** que la conexión de tiempo real se corta, **cuando** se restablece, **entonces** la tabla se refresca para recuperar lo ocurrido mientras estuvo caída; mientras está caída se muestra un indicador discreto de "Sin conexión en tiempo real" y la tabla sigue funcionando con refresco manual.
- **Dado** que la conexión se cortó y vuelve, **cuando** el servidor aún guarda los avisos que me perdí (los últimos 200 de esta ejecución del servidor), **entonces** los recibo al reconectar y se tratan igual que los de en vivo: cuentan para el contador de la pestaña, para "N pedidos nuevos" y para el resalte. Si el servidor se reinició, esos avisos no existen y la tabla solo se refresca.
- **Dado** que dos administradores usan la pestaña a la vez, **cuando** uno cambia un estado, **entonces** el otro lo ve actualizado.

### Pedidos nuevos resaltados (HU-32)

- **Dado** que llega un pedido nuevo mientras el panel está abierto, **cuando** aparece en la tabla, **entonces** su fila se distingue de las demás con un borde izquierdo grueso, un fondo suave y la etiqueta de texto "Nuevo" (no depende solo del color).
- **Dado** que hay pedidos resaltados en la tabla, **cuando** miro sobre ella, **entonces** veo cuántos hay ("N pedidos nuevos sin revisar") y una acción "Marcar como vistos" que quita el resalte de todos.
- **Dado** un pedido resaltado, **cuando** abro su detalle o avanzo su estado, **entonces** deja de estar resaltado.
- **Dado** que cambio de sección del panel o de página de la tabla, **cuando** vuelvo, **entonces** los pedidos nuevos que no he revisado siguen resaltados; al recargar el navegador el resalte se pierde (solo cuentan los que llegaron con el panel abierto).

### Aviso con la pestaña oculta (HU-32)

- **Dado** que el panel está abierto pero la pestaña del navegador no está visible, **cuando** entra un pedido comprado nuevo, **entonces** el título de la pestaña muestra el contador de nuevos (`(3) Pedidos | Salazar SAC`) y el favicon muestra un indicador de pendientes.
- **Dado** que el contador es mayor que cero, **cuando** vuelvo a la pestaña, **entonces** el contador se reinicia, el título y el favicon vuelven a su estado normal.
- **Dado** que llegó un pedido nuevo, **cuando** el contador cuenta, **entonces** cuenta solo pedidos comprados nuevos (no cambios de estado) y **no depende de los filtros** de la tabla.
- **Dado** que estoy en otra sección del panel (por ejemplo Platos) con la pestaña oculta, **cuando** entra un pedido nuevo, **entonces** el contador también aumenta, porque la conexión de tiempo real vive mientras el panel esté abierto, no solo en `/admin/pedidos`.

### Cambiar el estado de entrega (HU-33)

- **Dado** un pedido "En preparación", **cuando** miro su fila, **entonces** la acción es el botón "Marcar en camino"; con "En camino", "Marcar entregado"; con "Entregado" no hay botón de avance.
- **Dado** que pulso el botón de avance, **cuando** el servidor lo confirma, **entonces** el estado de la fila cambia al siguiente y el cliente lo ve en "Mis pedidos" al consultar (HU-25).
- **Dado** que el estado solo avanza un paso a la vez, **cuando** se intenta saltar un paso (de En preparación a Entregado) o retroceder, **entonces** el servidor lo rechaza con un error de validación y el estado no cambia.
- **Dado** que pasar a **Entregado** no se puede deshacer, **cuando** pulso "Marcar entregado", **entonces** pide una confirmación breve ("¿Marcar el pedido SAL-001042 como entregado?") antes de aplicarlo. "Marcar en camino" no pide confirmación.
- **Dado** que un pedido es de **Recojo**, **cuando** miro su acción, **entonces** sigue el mismo flujo de tres estados con los mismos textos (no se distingue en esta historia).
- **Dado** que el botón se pulsó, **cuando** la solicitud está en curso, **entonces** el botón queda deshabilitado para evitar doble envío; si falla, veo un mensaje de error y la fila conserva su estado.
- **Dado** que otro administrador ya avanzó ese mismo pedido, **cuando** pulso el botón con la fila desactualizada, **entonces** el servidor lo rechaza como transición inválida (no avanza dos pasos), la fila se refresca y veo un aviso de que el pedido ya había cambiado.
- **Dado** que cambia el estado, **cuando** se confirma, **entonces** se emite el aviso de tiempo real a todos los paneles abiertos.

### Detalle del pedido (HU-32)

- **Dado** una fila de la tabla, **cuando** hago clic en ella (o en el código), **entonces** se abre un detalle (panel lateral o diálogo) con: código, fecha, cliente con **teléfono**, tipo, dirección completa y referencia (solo Entrega), zona, platos con cantidad y precio, subtotal, descuento, envío, total, método de pago (y con cuánto paga y el vuelto, si es efectivo), estados de pago y entrega, y el mismo botón de avance.
- **Dado** que el detalle está abierto, **cuando** llega un cambio de ese pedido, **entonces** el detalle se actualiza.
- **Dado** el detalle, **cuando** lo miro, **entonces** no muestra el código de entrega de 4 dígitos (es un secreto del cliente; ver HU-19).

### Seguridad

- **Dado** cualquier solicitud de la sección (lista, detalle, cambio de estado, conexión de tiempo real), **cuando** no hay sesión válida de Administrador, **entonces** el servidor responde 401 (sin sesión) o 403 (sin rol).
- **Dado** el cambio de estado, **cuando** se recibe, **entonces** el servidor valida la transición y no confía en el estado que envíe el navegador como "actual".
- **Dado** el canal de tiempo real, **cuando** emite un aviso, **entonces** no incluye datos personales ni importes: solo el tipo de evento y el id del pedido.

## Casos borde

- La **fecha de compra** es `COALESCE(paid_at, created_at)`, igual que en HU-25; se muestra en hora de Lima.
- Un cliente con la cuenta desactivada (`is_active = false`) conserva su nombre en los pedidos antiguos.
- El **vuelto** solo se muestra con contraentrega en efectivo y monto indicado; si no indicó monto, solo se muestra "Efectivo".
- Pedidos **PENDIENTE_COBRO** pagan al recibir: pasar a "Entregado" **no** cambia su estado de pago en esta historia (`status` sigue siendo `PENDIENTE_COBRO`). Registrar el cobro queda fuera.
- Un pedido que se cancela o vence mientras está en la tabla solo puede ser `PENDIENTE_PAGO`, que no se lista; no hay caso de cancelar un pedido comprado en esta historia.
- Si el administrador escribe un código inexistente, la tabla queda vacía con el estado vacío de filtros.
- El navegador puede limitar el audio y las notificaciones; esta historia no usa sonido ni notificaciones del sistema.
- La sesión vence mientras la pestaña está abierta: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión y la conexión de tiempo real se cierra.
- Con muchos pedidos nuevos seguidos, los avisos se agrupan para no disparar una consulta por cada uno.
- Un panel con la conexión lenta o colgada no retrasa a los demás ni a la confirmación del pedido: cada panel recibe sus avisos en su propio hilo.

## Fuera de alcance

- Cancelar, reembolsar o editar el contenido de un pedido.
- Registrar el cobro de un pedido contraentrega (cambiar `status` a `PAGADO`).
- Retroceder un estado de entrega o saltar pasos.
- El estado "Recibido" de HU-26 y el seguimiento en vivo del cliente (HU-26); el cliente ve el cambio al consultar o recargar.
- Notificar al cliente por correo o en pantalla al cambiar el estado.
- Sonido o notificaciones del sistema para pedidos nuevos.
- Asignar repartidor, rutas o confirmar la entrega con el código de 4 dígitos.
- Exportar pedidos o reportes de ventas (HU-34).
- Una vista separada para repartidores.
- Persistir los avisos más allá de la memoria del servidor (tras un reinicio no se reenvían) y escalado a varias instancias del backend (el tiempo real usa memoria de una instancia; ver `plan.md`).

## Decisiones de clarificación

- **Una sola pestaña**: ver y cambiar estado van en `/admin/pedidos`, no en una vista aparte con buscador.
- **Tiempo real**: SSE (Server-Sent Events), no WebSocket; el flujo es del servidor al navegador y los cambios de estado usan un `PATCH` normal.
- **El aviso no lleva datos**: el navegador, al recibirlo, vuelve a pedir la lista a la API (`@tanstack/react-query`), de modo que la lista nunca depende de lo que viaje por el canal.
- **Pedidos listados**: solo comprados (`PAGADO` o `PENDIENTE_COBRO`).
- **Estados**: los tres de `delivery_status`; avance de un paso, sin retroceso. "Recibido" no existe.
- **Orden por defecto**: fecha de compra descendente, desempate por id descendente.
- **Filtros por defecto**: estado de entrega "Activos" y fecha "Todas".
- **Columnas ordenables**: Código, Fecha, Cliente, Zona, Total y Estado de entrega. Tipo, Pago y Estado de pago solo se filtran.
- **Servidor**: filtros, búsqueda, orden y paginación (20 por página) se resuelven en el servidor; la URL guarda el estado de la vista.
- **Contador de la pestaña**: título del documento y favicon, con la pestaña oculta; no depende de filtros ni de la sección del panel donde esté el administrador.
- **Filtro de fecha**: atajos (Hoy, Ayer, Últimos 7 días, Todas) y rango personalizado con Desde y Hasta, para poder ajustar el periodo.
- **Filtro de zona**: lista todas las zonas existentes (activas e inactivas) y filtra por el nombre guardado en el pedido (`delivery_zone_name`), porque un pedido antiguo puede tener una zona que luego se desactivó o renombró.
- **Pedidos de Recojo**: usan los mismos estados y textos que Entrega. Toda la interfaz está en español; el valor interno (`EN_CAMINO`) nunca se muestra: "En preparación", "En camino" y "Entregado". Un texto propio para Recojo (por ejemplo "Listo para recoger") sería una historia aparte porque cambia lo que ve el cliente en HU-25.
- **Confirmación**: solo al marcar "Entregado", por ser el paso final.

## Preguntas abiertas

Ninguna.
