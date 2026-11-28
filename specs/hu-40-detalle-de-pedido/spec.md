# Spec: HU-40 — Ver el detalle de un pedido desde Mis pedidos

**Épica**: [E5. Perfil del cliente](../../docs/epicas.md#e5)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada abra con un clic cualquiera de sus pedidos de "Mis pedidos" y vea todo sobre él: en qué etapa de la entrega está (con el mismo indicador de la tarjeta, pero grande), qué pidió, cómo lo recibe, cómo paga y cuánto, sin salir de su perfil. Además, que llegue a "Mis pedidos" en un clic desde el menú que se despliega al pulsar su nombre en el navegador superior.

## Contexto (qué ya existe y qué falta)

- HU-25 lista los pedidos comprados en `/perfil/mis-pedidos` con tarjetas que muestran solo nombre, precio, fecha y estado; dejó el detalle fuera de alcance y las tarjetas **no son clicables**.
- HU-26 definió el flujo completo de estados y el componente `DeliveryProgress` (nombre del estado más una línea de hitos), con rutas distintas para Recojo ("Listo para recoger") y Entrega ("En camino"), y los estados negativos (`RECHAZADO`, `CANCELADO`, `FALLIDO`) con motivo y aviso de reembolso. También permite al cliente cancelar un pedido `PENDIENTE`.
- HU-21 muestra el detalle completo del pedido **solo justo después de comprar** en `/checkout/resultado?pedido={id}`. Esa pantalla es del checkout (indicador de pasos en "¡Listo!") y no sirve como detalle permanente.
- El backend ya expone `GET /api/orders/{id}` solo para el dueño del pedido, con platos, importes, tipo de entrega, dirección, medio de cobro, fechas, código de entrega, estado de entrega, motivo y reembolso. No se necesitan datos nuevos.
- El menú que se despliega al pulsar el nombre del usuario en el navegador superior tiene hoy "Mi perfil" (clientes) o "Panel de administración" (administradores) y "Cerrar sesión".

## Actor(es)

Cliente con sesión iniciada. Los administradores no usan `/perfil` (ver HU-23) y no ven el atajo "Mis pedidos".

## Criterios de aceptación

### Acceso desde el menú del nombre

- **Dado** que soy Cliente con sesión iniciada, **cuando** pulso mi nombre en el navegador superior, **entonces** el menú desplegable muestra "Mis pedidos" entre "Mi perfil" y "Cerrar sesión".
- **Dado** que el menú está abierto, **cuando** elijo "Mis pedidos", **entonces** voy a `/perfil/mis-pedidos` y el menú se cierra.
- **Dado** que soy Administrador, **cuando** abro el menú de mi nombre, **entonces** no veo "Mis pedidos".
- **Dado** que uso el teclado, **cuando** navego el menú, **entonces** "Mis pedidos" es un elemento de menú más, con el mismo foco, `Escape` y cierre al hacer clic fuera que los demás.

### Abrir el detalle desde la lista

- **Dado** una tarjeta de "Mis pedidos", **cuando** hago clic en ella (nombre, estado, precio o cualquier zona), **entonces** voy al detalle de ese pedido en `/perfil/mis-pedidos/{id}`.
- **Dado** que uso el teclado o un lector de pantalla, **cuando** navego la lista, **entonces** cada tarjeta se anuncia como un enlace al detalle del pedido (por ejemplo "Ver detalle del pedido SAL-001042") y recibe foco visible.
- **Dado** una tarjeta con el botón "Cancelar pedido" (pedido `PENDIENTE`), **cuando** pulso ese botón, **entonces** se abre el diálogo de cancelación y **no** se abre el detalle.
- **Dado** que estoy en el detalle, **cuando** miro la navegación vertical del perfil, **entonces** la pestaña "Mis pedidos" sigue marcada como activa.
- **Dado** que vuelvo a la lista desde el detalle (enlace "Volver a mis pedidos" o botón atrás del navegador), **cuando** la lista aparece, **entonces** conserva la página en la que estaba (`?page=N`).

### Qué muestra el detalle

El detalle es una pantalla del perfil con estas secciones, en este orden:

1. **Encabezado**: enlace "Volver a mis pedidos", el **nombre del pedido** (el mismo título de la tarjeta, ver HU-25), el **código del pedido** (`SAL-001042`) y la **fecha de compra** con hora (hora de Lima, por ejemplo "7 nov 2026, 14:30").
2. **Estado de entrega**: ver sección siguiente.
3. **Cómo lo recibes**: **Entrega a domicilio** con la etiqueta, la dirección y la referencia (si la hay) guardadas en el pedido, o **Recojo en tienda**.
4. **Cómo pagas**: **Pago en línea** con su estado ("Pagado"), o **Pago contraentrega** con el medio (Efectivo o Billetera virtual: Yape o Plin) y, si es efectivo, "Pagarás con S/ 100.00 (vuelto S/ 15.00)".
5. **Detalle de los platos**: una fila por plato con **nombre**, **cantidad**, **precio unitario** y **subtotal de la línea**; luego **Subtotal**, **Delivery** (o "Recojo en tienda, sin costo") y **Total**, con formato `S/ 32.00`.
6. **Fechas**: **fecha de compra** y **fecha de pago** con hora; con contraentrega, la fecha de pago aparece como "Pendiente, se paga al recibir" hasta que el pedido se cobre.
7. **Código de entrega**: ver reglas abajo.
8. **Acciones**: "Cancelar pedido" solo si el pedido está `PENDIENTE` (mismo diálogo y reglas que en la tarjeta, HU-26); al confirmar, el detalle pasa a mostrar el estado `CANCELADO` sin recargar.

- **Dado** que algún dato opcional no existe (referencia de la dirección, vuelto, fecha de pago), **cuando** miro el detalle, **entonces** esa línea no aparece o muestra el texto indicado, nunca "null" ni un valor vacío.
- **Dado** que el catálogo cambió después de comprar (plato editado o eliminado), **cuando** abro el detalle, **entonces** nombres y precios son los del momento de la compra (copia en `order_items`).

### Estado de entrega (versión grande)

- **Dado** un pedido en curso, **cuando** miro el estado, **entonces** veo el **mismo indicador de la tarjeta** de "Mis pedidos" (nombre del estado actual y una línea de hitos con puntos marcados hasta el actual), pero **más grande**: texto del estado mayor, puntos más grandes, línea más gruesa y **la etiqueta de cada hito escrita bajo su punto** (Pendiente, Confirmado, Preparando, Listo para recoger o En camino, Entregado; "Recogido" en Recojo), con el mensaje del estado actual debajo (por ejemplo "Estamos preparando tu pedido"). Usa los mismos colores, hitos y reglas que la tarjeta (HU-25/HU-26): el hito actual y los anteriores van marcados, los siguientes sin marcar.
- **Dado** que el pedido es de Recojo o de Entrega, **cuando** miro los hitos, **entonces** veo los de su ruta (el de Recojo termina en "Listo para recoger" antes de "Recogido"; el de Entrega pasa por "En camino"), igual que en la tarjeta.
- **Dado** el estado `LISTO_PARA_ENVIO` (interno), **cuando** lo miro, **entonces** se ve como "Preparando", igual que en la tarjeta.
- **Dado** un pedido `RECHAZADO`, `CANCELADO` o `FALLIDO`, **cuando** miro el estado, **entonces** no hay línea de hitos: veo el mensaje del estado en color de error, el **motivo** si lo hay y, si corresponde, "Te devolveremos el pago" (reembolso pendiente) o "Pago reembolsado", igual que en la tarjeta pero más grande.
- **Dado** que uso un lector de pantalla, **cuando** consulto el estado, **entonces** se anuncia el estado actual con palabras (no depende solo del color) y la línea de hitos se anuncia como una lista de pasos que indica cuál es el actual.
- **Dado** que la pantalla es angosta (celular), **cuando** miro la línea de hitos, **entonces** las etiquetas siguen legibles (se ajustan a dos líneas, sin cortarse ni desbordar la pantalla).

### Código de entrega

- **Dado** un pedido **en curso** (`PENDIENTE`, `CONFIRMADO`, `EN_PREPARACION`, `LISTO_PARA_RECOGER`, `LISTO_PARA_ENVIO`, `EN_CAMINO`), **cuando** abro el detalle, **entonces** veo el **código de entrega de 4 dígitos** con la indicación de dárselo a quien lo entrega o a la tienda al recibir el pedido.
- **Dado** un pedido en estado final (`ENTREGADO`, `RECHAZADO`, `CANCELADO`, `FALLIDO`), **cuando** abro el detalle, **entonces** no veo el código: ya no tiene uso.

### Cargando, error y no encontrado

- **Dado** que el detalle aún no llegó, **cuando** abro la pantalla, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar y el enlace "Volver a mis pedidos".
- **Dado** que abro un enlace a un pedido que no existe, que es de otro cliente, o que no aparece en mi historial (pago en línea no completado: pendiente de pago o vencido, ver HU-25; un pedido contraentrega, fallido, rechazado o cancelado sí tiene detalle), **cuando** carga la pantalla, **entonces** veo "No encontramos este pedido" con el enlace "Volver a mis pedidos"; no se revela si el pedido existe.
- **Dado** que el identificador de la URL no es un entero positivo, **cuando** abro la pantalla, **entonces** veo el mismo "No encontramos este pedido".
- **Dado** que no tengo sesión, **cuando** abro `/perfil/mis-pedidos/{id}`, **entonces** soy llevado a iniciar sesión y, al lograrlo, vuelvo a ese pedido.

### Seguridad

- **Dado** que se pide el detalle, **cuando** el servidor responde, **entonces** solo incluye pedidos del cliente con sesión; si el pedido es de otro cliente responde igual que si no existiera (404), y sin sesión válida responde 401.

## Casos borde

- El detalle no se actualiza solo: el estado se refresca al recargar o volver a entrar (el seguimiento en vivo sigue fuera de alcance, ver HU-26). Al volver a la pestaña "Mis pedidos" desde el detalle, la lista no muestra un estado más viejo que el del detalle que acaba de verse (se invalida la caché de la lista al cancelar).
- Un pedido con muchos platos o con nombres largos no desborda la pantalla: los nombres se parten en varias líneas y la tabla de platos se adapta al ancho del celular.
- Pedido de Recojo: no tiene dirección ni costo de delivery; la sección "Cómo lo recibes" dice "Recojo en tienda" y el delivery se muestra como "Recojo en tienda, sin costo".
- Un pedido de contraentrega por billetera virtual no tiene vuelto ni monto declarado; solo se muestra el medio.
- Pedidos existentes con estados antiguos de HU-25 (`EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`) se muestran con las reglas ya definidas en HU-26.
- La sesión vence mientras uso la pantalla: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión.
- La pantalla no cambia el estado del pedido; el único cambio que el cliente puede hacer es cancelarlo mientras está `PENDIENTE`.

## Fuera de alcance

- Repetir el pedido (HU-27).
- Seguimiento en tiempo real del estado (se ve al consultar o recargar).
- Descargar o imprimir el comprobante o la boleta.
- Reintentar el pago en línea de un pedido sin pagar (HU-19) o ver pedidos sin pagar.
- Cambiar la dirección, los platos o el método de pago de un pedido ya hecho.
- Mostrar el historial de cambios de estado con fechas y horas (solo se ve el estado actual).
- Atajos adicionales en el menú del nombre (por ejemplo "Mis direcciones").
- Cambios en la pantalla de confirmación `/checkout/resultado` (HU-21).

## Decisiones de clarificación

- **Historia nueva (HU-40)** en la épica E5, que completa HU-25 sin modificar su spec ya cerrada; el "Fuera de alcance" de HU-25 sobre el detalle queda cubierto aquí.
- **Ruta**: `/perfil/mis-pedidos/{id}`, dentro del perfil (con su navegación vertical y la pestaña "Mis pedidos" activa), en lugar de una ventana emergente, para poder recargar o compartir el enlace y que el botón atrás funcione.
- **Tarjeta clicable entera**, con el botón "Cancelar pedido" como excepción que no navega.
- **Estado grande**: se reutiliza el componente `DeliveryProgress` de la tarjeta con una variante de tamaño grande (no un indicador nuevo) para que ambos nunca diverjan en hitos, colores o textos; la variante grande agrega la etiqueta bajo cada punto.
- **Código de entrega** visible solo mientras el pedido está en curso: es un secreto del cliente (HU-26), útil hasta entregarse y sin uso después.
- **Pedidos visibles**: los mismos que aparecen en el historial, es decir, con estado de pago `PAGADO` (en línea) o `PENDIENTE_COBRO` (contraentrega), sea cual sea su estado de entrega (incluidos `RECHAZADO`, `CANCELADO` y `FALLIDO`); los pedidos con pago en línea sin completar (`PENDIENTE_PAGO` o pago vencido) responden "No encontramos este pedido" en esta pantalla, aunque el pedido exista (así se evita mostrar pedidos pendientes de pago como si estuvieran comprados).
- **Menú del nombre**: "Mis pedidos" va solo para Clientes, entre "Mi perfil" y "Cerrar sesión".
- **Sin cambios de base de datos** ni de modelo de datos: se reutiliza `GET /api/orders/{id}` (HU-21), que el checkout también usa para pedidos sin pagar; por eso la pantalla decide en el cliente si el pedido es visible (`PAGADO` o `PENDIENTE_COBRO`) y el plan debe confirmar que no hace falta tocar el backend.

## Preguntas abiertas

Ninguna.
