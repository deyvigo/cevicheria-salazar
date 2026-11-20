# Spec: HU-34 — Reporte de ventas

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: En implementación

## Objetivo

Que el Administrador vea en la sección **Reportes** del panel cuánto vendió el negocio, por día y por método de pago, y qué platos se piden más, para controlar los ingresos sin salir del panel.

## Contexto (qué ya existe y qué falta)

- El panel (HU-28) ya tiene la sección **Reportes** en la navegación vertical (`/admin/reportes`), hoy sin contenido.
- Todos los datos existen ya en `orders` y `order_items` (HU-19, HU-20, HU-26): `total`, `discount`, `delivery_price`, `payment_method` (`ONLINE` o `CONTRAENTREGA`), `collection_method` (`EFECTIVO` o `YAPE`, solo con contraentrega), `delivery_type`, `status`, `delivery_status`, `refund_status`, `created_at` y `paid_at`. Esta historia no agrega tablas ni columnas; como mucho, índices.
- La lista de pedidos del panel (HU-32) usa como "comprados" los pedidos `PAGADO` o `PENDIENTE_COBRO`.

## Actor(es)

Administrador con sesión iniciada. Los clientes no acceden a `/admin`.

## Pantalla

En `/admin/reportes`, de arriba abajo:

1. **Filtros**: rango de fechas con atajos (Hoy, 7 días, 30 días, Este mes y Personalizado), método de pago y tipo de entrega. Quedan en la URL.
2. **Tarjetas de resumen**: Ingresos, Pedidos, Ticket promedio, Descuentos, Por cobrar y Reembolsos pendientes.
3. **Ventas por día**: gráfica de barras con el ingreso de cada día del rango.
4. **Ventas por método de pago**: gráfica de dona con tabla al lado (método, pedidos, ingresos y porcentaje).
5. **Platos más vendidos**: tabla con los 10 primeros (plato, unidades e ingresos).

Se replican los componentes `Card`, `Input` y `Button` del `design-system/`; los colores de las gráficas salen de los tokens, nunca valores sueltos.

## Criterios de aceptación

### Acceso

- **Dado** que soy Administrador, **cuando** abro `/admin/reportes`, **entonces** veo la pantalla con el rango por defecto (últimos 7 días); recargar conserva rango y filtros (todo en la URL).
- **Dado** que no tengo sesión o no soy Administrador, **cuando** intento abrir la pantalla o pedir los datos, **entonces** soy llevado a iniciar sesión o el servidor responde 401/403, igual que el resto del panel (HU-28).

### Filtros

- **Dado** los atajos de rango, **cuando** elijo uno, **entonces** todo el reporte se recalcula para ese rango; con "Personalizado" elijo fecha inicial y final.
- **Dado** que elijo una fecha final anterior a la inicial, **cuando** valido, **entonces** veo un error junto al campo y no se pide el reporte.
- **Dado** que elijo un rango de más de 366 días, **cuando** valido, **entonces** veo un error y no se pide el reporte.
- **Dado** que elijo un método de pago (Online, Efectivo o Yape) o un tipo de entrega (Entrega o Recojo), **cuando** se aplica, **entonces** tarjetas, gráficas y ranking consideran solo esos pedidos.
- **Dado** que cambio cualquier filtro, **cuando** se aplica, **entonces** la pantalla muestra un estado de carga y, si falla, un mensaje con "Reintentar".

### Tarjetas de resumen

- **Dado** el rango elegido, **cuando** miro las tarjetas, **entonces** veo:
  - **Ingresos**: suma de `total` de los pedidos que cuentan como venta.
  - **Pedidos**: cantidad de esos pedidos.
  - **Ticket promedio**: ingresos entre pedidos (`S/ 0.00` si no hay pedidos).
  - **Descuentos**: suma de `discount` de esos pedidos.
  - **Por cobrar**: suma de `total` de los pedidos de contraentrega aún no cobrados (`PENDIENTE_COBRO`); no entra en Ingresos.
  - **Reembolsos pendientes**: cantidad y suma de `total` de los pedidos con `refund_status = PENDIENTE`; no depende del rango de fechas (es deuda vigente).
- **Dado** montos, **cuando** se muestran, **entonces** usan el formato `S/ 32.00`.

### Ventas por día

- **Dado** el rango elegido, **cuando** miro la gráfica, **entonces** hay una barra por día con su ingreso y los días sin ventas aparecen en cero (no se omiten).
- **Dado** un rango de más de 31 días, **cuando** se muestra la gráfica, **entonces** se agrupa por semana (más de 120 días, por mes) para que siga legible.
- **Dado** que paso el cursor (o toco) una barra, **cuando** se muestra el detalle, **entonces** veo la fecha, el ingreso y la cantidad de pedidos.

### Ventas por método de pago

- **Dado** el rango elegido, **cuando** miro la sección, **entonces** veo una dona con un segmento por método (Online, Efectivo, Yape) y una tabla con pedidos, ingresos y porcentaje del total; la dona coincide con la tabla y muestra el ingreso total en el centro.
- **Dado** que paso el cursor (o toco) un segmento de la dona, **cuando** se muestra el detalle, **entonces** veo el método, el ingreso, los pedidos y el porcentaje.
- **Dado** que un método no tiene ventas, **cuando** miro la tabla, **entonces** aparece con ceros.

### Platos más vendidos

- **Dado** el rango elegido, **cuando** miro el ranking, **entonces** veo hasta 10 platos ordenados por unidades vendidas (desempate por ingresos) con unidades e ingresos (`line_total`), usando el nombre guardado en el pedido.
- **Dado** que un plato fue desactivado o eliminado después de venderse, **cuando** miro el ranking, **entonces** sigue apareciendo con su nombre del pedido.

### Sin datos

- **Dado** un rango sin ventas, **cuando** miro la pantalla, **entonces** las tarjetas muestran ceros y las gráficas y el ranking muestran "No hay ventas en este periodo".

## Casos borde

- **Qué cuenta como venta**: pedidos comprados cuyo dinero ya entró, es decir `status = PAGADO` y `delivery_status` distinto de `RECHAZADO` y `CANCELADO` (un pedido online rechazado o cancelado sigue como `PAGADO` en la base, con el reembolso pendiente, pero el dinero se devuelve). Un pedido online `FALLIDO` sí cuenta: el dinero entró y no se reembolsa. Quedan fuera `PENDIENTE_PAGO` y `CANCELADO`, y los `PENDIENTE_COBRO` se reportan aparte en "Por cobrar". Un pedido online `RECHAZADO` o `CANCELADO` por el negocio con reembolso (pendiente o hecho) no suma a Ingresos; su reembolso pendiente se ve en la tarjeta correspondiente.
- **Contraentrega que termina `RECHAZADO`, `CANCELADO` o `FALLIDO`**: nunca se cobró, así que no entra en Ingresos ni, una vez terminada, en "Por cobrar".
- **Fecha que agrupa**: la fecha en que entró el dinero, `paid_at` (aprobación de Mercado Pago o cobro de la contraentrega). Así una contraentrega pedida el lunes y entregada el martes cuenta el martes. "Por cobrar" no tiene `paid_at`; se filtra por `created_at`.
- **Zona horaria**: los días se cortan en `America/Lima`, no en UTC; un pedido de las 21:00 en Lima cuenta ese día, no el siguiente. Las fechas del filtro se interpretan en Lima.
- **Rango inclusivo**: la fecha final incluye todo ese día hasta las 23:59:59 hora de Lima.
- **Método de pago de la fila**: `ONLINE` es Online; `CONTRAENTREGA` es Efectivo o Yape según `collection_method`. Es el mismo criterio de la columna Pago de HU-32.
- **Precisión**: sumas y porcentajes se calculan en el servidor con `NUMERIC`, nunca con decimales binarios; los porcentajes de la tabla suman 100 (el redondeo se ajusta en la mayor fila).
- **Rendimiento**: las consultas agregan en base de datos, sin traer pedidos al servidor de aplicación; si hace falta, índice sobre `paid_at` para pedidos `PAGADO`.
- **Datos que cambian**: el reporte se calcula al pedirlo; no se actualiza en tiempo real. Un botón "Actualizar" vuelve a pedirlo.

## Fuera de alcance

- Exportar a CSV, Excel o PDF.
- Reportes por zona de delivery, por categoría, por cliente o de clientes recurrentes.
- Ventas por hora del día o día de la semana.
- Tasa de pedidos rechazados, cancelados y fallidos.
- Reseñas y calificaciones (HU-41).
- Comparar contra el periodo anterior.
- Marcar reembolsos como hechos desde el reporte (eso ya se hace en Pedidos, HU-32/HU-33).
- Actualización en tiempo real.
- Layout para celular (iteración posterior, como el resto del panel).

## Decisiones de clarificación

- **Delivery en ingresos**: los ingresos usan el `total` completo, tal como lo paga el cliente (el descuento ya está restado e incluye `delivery_price`).
- **Fecha que agrupa**: `paid_at`, porque el reporte controla ingresos de caja; "Por cobrar" se filtra por `created_at`.
- **Desglose por método**: tres filas (Online, Efectivo, Yape).
- **Tarjetas Por cobrar y Reembolsos pendientes**: entran en la primera versión.
- **Atajos de rango**: Hoy, 7 días, 30 días, Este mes y Personalizado; por defecto, 7 días.
- **Ranking de platos**: solo pedidos que cuentan como venta (`PAGADO`); los `PENDIENTE_COBRO` no entran.
- **Gráfica de método de pago**: dona (con tabla al lado), no barras.
