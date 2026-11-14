# Spec: HU-25 — Ver el historial de mis pedidos

**Épica**: [E5. Perfil del cliente](../../docs/epicas.md#e5)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada vea en su perfil todos los pedidos que ha comprado, del más reciente al más antiguo, y sepa de un vistazo en qué etapa de la entrega está cada uno.

## Contexto (qué ya existe y qué falta)

El perfil (HU-23, HU-24) tiene navegación vertical con las pestañas **Mi información** y **Mis direcciones**; esta historia agrega **Mis pedidos**. Los pedidos ya existen en la base de datos (`orders` y `order_items`, HU-19 y HU-20) con copia del nombre, precio y cantidad de cada plato, así que el historial no cambia si el catálogo cambia después.

Hoy `orders.status` solo describe el **pago** (`PENDIENTE_PAGO`, `PENDIENTE_COBRO`, `PAGADO`, `CANCELADO`). **No existe** un campo para el **estado de la entrega**; esta historia lo agrega (ver Decisiones de clarificación). Quién y cómo cambia ese estado (el Administrador desde su panel de pedidos) y la vista de seguimiento del pedido actual (HU-26) quedan fuera: aquí el estado solo se muestra.

## Actor(es)

Cliente con sesión iniciada. Los administradores no usan `/perfil` (ver HU-23).

## Criterios de aceptación

### Navegación

- **Dado** que estoy en el perfil, **cuando** miro la navegación vertical, **entonces** veo la pestaña "Mis pedidos" después de "Mis direcciones", con su propia URL (`/perfil/mis-pedidos`); recargar la página conserva la pestaña.
- **Dado** que no tengo sesión, **cuando** abro `/perfil/mis-pedidos`, **entonces** soy llevado a iniciar sesión y, al lograrlo, vuelvo a esa pestaña.

### Ver la lista

- **Dado** que tengo pedidos comprados, **cuando** entro a "Mis pedidos", **entonces** veo una tarjeta por pedido, ordenadas de la más reciente a la más antigua por fecha de compra.
- **Dado** una tarjeta de pedido, **cuando** la miro, **entonces** muestra solo: el **nombre** del pedido, el **precio** total (formato `S/ 32.00`), la **fecha de compra** y el **estado de entrega**. No muestra dirección, método de pago, código de entrega ni el detalle de platos.
- **Dado** que no tengo pedidos comprados, **cuando** entro a "Mis pedidos", **entonces** veo un estado vacío ("Aún no tienes pedidos") con un enlace para ir a la carta.
- **Dado** que la pantalla aún no recibió mis pedidos, **cuando** la abro, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.

### Estado de entrega

- **Dado** una tarjeta de pedido, **cuando** miro su estado, **entonces** veo el nombre del estado en texto y debajo una línea con **3 puntos** (En preparación, En camino, Entregado): los puntos hasta el estado actual aparecen marcados y los siguientes sin marcar. En pantallas anchas el indicador va pequeño y centrado en la tarjeta, entre el nombre (izquierda) y el precio con la fecha (derecha), en horizontal; en celular se apila debajo del nombre.
- **Dado** que el pedido está "En preparación", **cuando** lo miro, **entonces** solo el primer punto está marcado; con "En camino", los dos primeros; con "Entregado", los tres.
- **Dado** que compro un pedido (el pago en línea se aprueba, o confirmo uno contraentrega), **cuando** aparece en mi historial, **entonces** su estado de entrega es "En preparación".
- **Dado** que el estado se comunica con texto y con la línea de puntos, **cuando** lo consulto con un lector de pantalla, **entonces** se anuncia el estado actual con palabras (no depende solo del color).

### Paginación

- **Dado** que tengo más de 10 pedidos, **cuando** abro "Mis pedidos", **entonces** veo los primeros 10 y la navegación de páginas (la misma de la tienda y el panel, `Pagination`); **y cuando** paso a la siguiente, veo los siguientes 10.
- **Dado** que cambio de página, **cuando** miro la URL, **entonces** lleva `?page=2`, de modo que recargar o compartir el enlace conserva la página.
- **Dado** que tengo 10 pedidos o menos, **cuando** abro la pestaña, **entonces** no se muestra la navegación de páginas.
- **Dado** que la página pedida en la URL ya no existe (o es inválida), **cuando** abro la pestaña, **entonces** se muestra la última página que exista (o la primera si el valor no es un entero positivo).

### Qué pedidos aparecen

- **Dado** que un pedido de pago en línea sigue sin pagarse (`PENDIENTE_PAGO`) o fue cancelado (`CANCELADO`), **cuando** veo mi historial, **entonces** no aparece: solo aparecen los pedidos comprados (`PAGADO` o `PENDIENTE_COBRO`).
- **Dado** que un pedido pendiente de pago se aprueba después, **cuando** actualizo mi historial, **entonces** aparece con su fecha de compra y estado "En preparación".

### Seguridad

- **Dado** que consulto el historial, **cuando** el servidor responde, **entonces** solo incluye pedidos míos; nunca pedidos de otro cliente, ni siquiera cambiando parámetros de la solicitud.
- **Dado** que no hay sesión válida, **cuando** se pide el historial, **entonces** el servidor responde 401.

## Casos borde

- La **fecha de compra** es el momento en que el pedido pasó a comprado: `paid_at` para el pago en línea y `created_at` para la contraentrega (que no tiene pago previo). Se muestra en hora de Lima, con formato legible en español (por ejemplo "7 nov 2026").
- Un pedido con **Recojo** usa los mismos tres estados y textos que uno con Entrega; no se distingue en esta historia.
- Platos del pedido eliminados o editados del catálogo después de comprar no alteran el historial: el nombre y el precio salen de la copia en `order_items`.
- Si dos pedidos tienen la misma fecha de compra, se ordenan por id descendente para que el orden sea estable entre páginas.
- Mientras estoy en la pestaña no se actualiza sola; el estado de entrega se refresca al recargar o volver a entrar (el seguimiento en vivo es HU-26).
- La sesión vence mientras uso la pantalla: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión.

## Fuera de alcance

- Ver el **detalle** de un pedido (platos, cantidades, dirección, método de pago, código de entrega): las tarjetas no son clicables en esta historia.
- Seguimiento del pedido actual, con más estados como "Recibido" (HU-26).
- Repetir un pedido anterior (HU-27).
- Cambiar el estado de entrega: lo hará el Administrador desde su panel de pedidos; en esta historia solo se crea el campo y se inicializa en "En preparación".
- Filtros, búsqueda u ordenamiento del historial.
- Ver pedidos pendientes de pago o cancelados, o reintentar su pago (HU-19).
- Notificaciones por correo o en pantalla al cambiar el estado.
- Historial de pedidos del Administrador.

## Decisiones de clarificación

- **Campo nuevo**: `orders.delivery_status` con valores `EN_PREPARACION`, `EN_CAMINO` y `ENTREGADO`, `NOT NULL DEFAULT 'EN_PREPARACION'` y un `CHECK` sobre esos valores. Es independiente de `status` (que sigue describiendo el pago). El valor inicial es "En preparación" para todo pedido nuevo; como solo se listan los comprados, un pedido sin pagar o cancelado nunca muestra su estado de entrega. Migración nueva (`V12__order_delivery_status.sql`) que deja los pedidos existentes en `EN_PREPARACION`; se actualiza `docs/diagrama-de-base-de-datos.md` en el mismo cambio.
- **Tarjeta**: nombre, precio y fecha de compra más el estado de entrega, nada más.
- **Nombre del pedido**: el pedido no tiene nombre propio, así que el título son los nombres de los platos, unidos por coma y recortados con "…" si son largos (por ejemplo "Ceviche clásico, Chicharrón de pota y 1 más"), con el código del pedido (`SAL-001042`) en texto pequeño debajo.
- **Precio**: lo que se pagó por ese pedido, es decir, el `total` (con delivery y descuento incluidos).
- **Pedidos listados**: solo los comprados (`PAGADO` o `PENDIENTE_COBRO`).
- **Pestaña**: "Mis pedidos", `/perfil/mis-pedidos`, tras "Mis direcciones".
- **Paginación**: 10 por página, `?page=N` en la URL, con el componente `Pagination` ya usado en catálogo y panel.
- **Estados visibles**: 3, con textos exactos "En preparación", "En camino" y "Entregado". "Recibido" de HU-26 no se muestra aquí.

## Preguntas abiertas

Ninguna.
