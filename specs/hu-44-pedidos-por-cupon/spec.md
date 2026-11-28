# Spec: HU-44 — Ver los pedidos que usaron un cupón

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador pase del número de usos de un cupón (sección **Cupones**, HU-43) a la lista de los pedidos que lo usaron, para saber quiénes lo aprovecharon y en qué estado están esos pedidos, reutilizando la tabla de **Pedidos** (HU-32) con un filtro por cupón.

## Contexto (qué ya existe y qué falta)

- HU-43 muestra en la columna **Cupos** cuántos pedidos ocupan un cupo (`12 / 50`), pero no cuáles.
- Los usos siguen la regla de HU-42: pedidos con el cupón en `PENDIENTE_PAGO`, `PENDIENTE_COBRO` o `PAGADO`. Para eliminar un cupón o fijar su código cuenta cualquier pedido que lo referencie, incluso `CANCELADO`.
- La tabla de Pedidos (HU-32, HU-26) solo lista pedidos **comprados** (`PAGADO` o `PENDIENTE_COBRO`), con búsqueda, filtros en la URL (`stage`, `type`, `payment`, `paymentStatus`, `zone`, `range`, `from`, `to`), orden, paginación y tiempo real. Por defecto muestra solo los pedidos **activos**.
- El detalle del pedido en el panel ya muestra el descuento con el código usado (HU-42). Cada pedido guarda `coupon_id` y una copia `coupon_code`.

## Actor(es)

Administrador con sesión iniciada.

## Criterios de aceptación

### Llegar desde Cupones

- **Dado** un cupón con al menos un pedido (en cualquier estado), **cuando** miro su fila en **Cupones**, **entonces** el número de usos de la columna **Cupos** es un enlace hacia `/admin/pedidos` filtrado por ese cupón, con el nombre accesible "Ver pedidos con CEVICHE10".
- **Dado** un cupón sin pedidos, **cuando** miro su fila, **entonces** el número de usos no es un enlace.
- Un cupón con `0 / 50` puede tener enlace: sus pedidos son pagos en línea vencidos, que se explican con el aviso de abajo.
- **Dado** que sigo el enlace, **cuando** se abre Pedidos, **entonces** el filtro de estado de entrega está en **Todos** (los usos incluyen pedidos ya entregados) y el resto de filtros en su valor por defecto.

### Filtro por cupón en Pedidos

- **Dado** que Pedidos está filtrado por cupón, **cuando** miro los filtros, **entonces** veo "Cupón: CEVICHE10" con una acción para quitarlo; el filtro va en la URL (`?coupon=CEVICHE10`) y recargar lo conserva.
- **Dado** el filtro por cupón, **cuando** lo combino con la búsqueda y los demás filtros, **entonces** se aplican todos a la vez (Y lógico), con el mismo orden, paginación y conteo ("N pedidos") de HU-32.
- **Dado** el filtro por cupón, **cuando** entra un pedido nuevo con ese cupón, **entonces** la tabla se actualiza en tiempo real igual que con cualquier otro filtro.
- **Dado** un código que no corresponde a ningún pedido, **cuando** abro la URL, **entonces** veo el estado vacío "No hay pedidos con estos filtros".
- **Dado** "Limpiar filtros", **cuando** lo pulso, **entonces** también se quita el filtro por cupón.
- El filtro compara por el código guardado en el pedido, sin distinguir mayúsculas ni espacios alrededor, igual que el checkout.

### Pedidos con el cupón que no se compraron

- **Dado** que Pedidos está filtrado por cupón y ese cupón tiene pedidos no comprados, **cuando** miro sobre la tabla, **entonces** veo un aviso que dice cuántos no aparecen y por qué, por ejemplo "Además, 2 pagos en línea pendientes y 1 pago en línea vencido usaron este cupón. No aparecen aquí porque no se compraron."
- El aviso cuenta los pedidos con el cupón en `PENDIENTE_PAGO` (pendientes, ocupan cupo) y en `CANCELADO` (vencidos o reemplazados, no ocupan cupo pero impiden eliminar el cupón). Solo menciona las partes que no son cero, usa singular o plural según el número y no depende de los demás filtros ni de la búsqueda.
- **Dado** que todos los pedidos con el cupón están comprados, **cuando** miro la tabla, **entonces** no hay aviso.
- **Dado** que no hay filtro por cupón, **cuando** miro Pedidos, **entonces** no hay aviso y la tabla se comporta igual que hoy.
- **Dado** que la tabla se actualiza en tiempo real (por ejemplo un pago pendiente se aprueba), **cuando** se refresca, **entonces** el aviso también se recalcula.

### Seguridad

- **Dado** la lista de pedidos con filtro por cupón, **cuando** no hay sesión de Administrador, **entonces** el servidor responde 401 o 403, como el resto del panel.

## Casos borde

- **Pedidos no comprados**: Pedidos sigue listando solo pedidos comprados (HU-32); los demás se cuentan en el aviso. Por eso la tabla puede mostrar menos pedidos que el número de usos de Cupones mientras hay pagos pendientes.
- **Cupón renombrado antes de su primer uso**: no afecta, porque un cupón con pedidos ya no cambia de código (HU-43).
- **Cupón eliminado**: solo se eliminan cupones sin pedidos, así que nunca hay pedidos de un cupón que ya no existe.

## Fuera de alcance

- Métricas de cupones en Reportes (soles descontados por cupón, usos por periodo).
- Una columna Cupón en la tabla de Pedidos: el cupón se ve con el filtro y en el detalle del pedido (HU-42).
- Listar en Pedidos los pedidos no comprados.
- Elegir el cupón desde un selector en los filtros de Pedidos (solo se llega desde Cupones o con la URL).

## Impacto en documentación

- `docs/historias.md`, `docs/epicas.md`, `docs/cronograma.md`: HU-44 (ya registrada).
- `specs/hu-43-gestion-cupones/spec.md`: el punto de fuera de alcance "ver qué pedidos o clientes usaron cada cupón" ya referencia HU-44.
- `docs/diagrama-de-base-de-datos.md`: un índice si el filtro lo necesita.

## Decisiones de clarificación

- **Pedidos no comprados**: no se listan; un aviso sobre la tabla dice cuántos pagos en línea pendientes y vencidos usaron el cupón.
- **Columna Cupón**: no se agrega; basta el filtro y el detalle.

## Preguntas abiertas

Ninguna.
