# Spec: HU-26 — Seguir el estado de mi pedido (flujo completo de estados de entrega)

**Épica**: [E5. Perfil y pedidos](../../docs/epicas.md#e5)
**Estado**: Hecha

## Objetivo

Que el cliente vea en qué punto está su pedido (recibido, confirmado, preparando, listo o en camino, entregado) y reciba aviso por correo en los hitos importantes, y que el restaurante controle ese flujo con una aceptación manual y rutas distintas para Recojo y Entrega. Reemplaza los 3 estados de HU-25/HU-33 por el flujo completo.

## Contexto

- Hoy `orders.delivery_status` vale `EN_PREPARACION`, `EN_CAMINO` o `ENTREGADO`; un pedido comprado entra directo a preparación y Recojo usa el mismo flujo y textos que Entrega (HU-32/33).
- El cliente solo ve el estado al consultar "Mis pedidos"; no hay avisos.
- `orders.status` solo describe el pago y no cambia por esta historia, salvo en un caso: un pedido contraentrega pasa a `PAGADO` al entregarse (ver "Pago contraentrega").

## Actor(es)

Cliente con sesión (ve su pedido y puede cancelarlo mientras está pendiente) y Administrador (mueve los estados).

## Estados

| Estado | Aplica a | Mensaje al cliente |
| --- | --- | --- |
| `PENDIENTE` | ambos | "Recibimos tu pedido, esperando confirmación" |
| `CONFIRMADO` | ambos | "El restaurante aceptó tu pedido" |
| `EN_PREPARACION` | ambos | "Estamos preparando tu pedido" |
| `LISTO_PARA_RECOGER` | recojo | "Tu pedido está listo, puedes pasar a recogerlo" |
| `LISTO_PARA_ENVIO` | delivery | Interno; el cliente lo ve como "Estamos preparando tu pedido" |
| `EN_CAMINO` | delivery | "Tu pedido va en camino" |
| `ENTREGADO` | ambos | "Pedido entregado, ¡buen provecho!" (Recojo: "Pedido recogido, ¡buen provecho!") |
| `RECHAZADO` | ambos | "No pudimos aceptar tu pedido" + motivo |
| `CANCELADO` | ambos | "Tu pedido fue cancelado" + motivo |
| `FALLIDO` | ambos | "No pudimos entregarte el pedido" (cliente ausente, no recogió) |

### Transiciones permitidas

```
PENDIENTE -> CONFIRMADO -> EN_PREPARACION -> LISTO_PARA_RECOGER -> ENTREGADO | FALLIDO       (Recojo)
PENDIENTE -> CONFIRMADO -> EN_PREPARACION -> LISTO_PARA_ENVIO -> EN_CAMINO -> ENTREGADO | FALLIDO   (Entrega)
PENDIENTE -> RECHAZADO
PENDIENTE | CONFIRMADO | EN_PREPARACION | LISTO_PARA_RECOGER | LISTO_PARA_ENVIO -> CANCELADO
```

Finales: `ENTREGADO`, `RECHAZADO`, `CANCELADO`, `FALLIDO`. `EN_CAMINO` no se cancela.

## Criterios de aceptación

### Estado inicial y aceptación

- **Dado** que se compra un pedido (pago aprobado o contraentrega), **cuando** queda comprado, **entonces** su estado de entrega es `PENDIENTE` y el cliente ve "Recibimos tu pedido, esperando confirmación" (no queda una vista vacía).
- **Dado** un pedido `PENDIENTE`, **cuando** el administrador pulsa "Aceptar", **entonces** pasa a `CONFIRMADO`; con "Rechazar" y un motivo obligatorio pasa a `RECHAZADO`.

### Avance (administrador)

- **Dado** un pedido, **cuando** el administrador avanza, **entonces** solo puede pasar al siguiente estado de su ruta (Recojo o Entrega) o a uno de los estados finales permitidos; el servidor rechaza saltos, retrocesos y salidas de un estado final con conflicto (409).
- **Dado** que se pasa a `RECHAZADO`, `CANCELADO` o `FALLIDO`, **cuando** el administrador confirma, **entonces** debe indicar un motivo (máx. 200 caracteres); sin motivo el servidor responde 400.
- **Dado** que dos administradores actúan sobre la misma fila desactualizada, **cuando** el segundo envía, **entonces** el servidor lo rechaza (409) y no avanza dos pasos (se conserva la comprobación del estado esperado de HU-33).
- **Dado** que se pasa a `ENTREGADO` (en Recojo y en Entrega), **cuando** el administrador pulsa el botón, **entonces** se abre un diálogo que pide el código de entrega de 4 dígitos que el cliente recibió al comprar; solo si coincide con el del pedido pasa a `ENTREGADO`. Con un código vacío, mal formado o incorrecto el servidor responde 400, el pedido no cambia y el diálogo sigue abierto con el aviso.
- **Dado** el detalle del pedido en el panel, **cuando** se mira, **entonces** sigue sin mostrar el código de entrega: es un secreto del cliente que el administrador solo recibe de él.

### Stock y reembolso

- **Dado** que un pedido pasa a `RECHAZADO` o `CANCELADO`, **cuando** se confirma, **entonces** se repone el stock de sus platos; `FALLIDO` no repone.
- **Dado** que un pedido pagado en línea (`status = PAGADO`) pasa a `RECHAZADO` o `CANCELADO`, **cuando** se confirma, **entonces** queda marcado "reembolso pendiente"; el administrador lo reembolsa a mano en Mercado Pago y lo marca "Reembolsado" desde el detalle. El pago contraentrega no genera reembolso.

### Pago contraentrega

- **Dado** un pedido contraentrega (`PENDIENTE_COBRO`), **cuando** el administrador lo pasa a `ENTREGADO` (con el código de entrega correcto), **entonces** su estado de pago pasa a `PAGADO` y queda registrada la fecha de pago (el momento de la entrega): el dinero se cobra al recibir.
- **Dado** un pedido contraentrega que termina `RECHAZADO`, `CANCELADO` o `FALLIDO`, **cuando** se confirma, **entonces** sigue en `PENDIENTE_COBRO` (nunca se cobró) y no genera reembolso.
- **Dado** un pedido pagado en línea, **cuando** se entrega, **entonces** su estado de pago y su fecha de pago no cambian (el pago ya lo fijó el webhook de Mercado Pago).
- **Dado** que un pedido contraentrega pasa a `PAGADO` al entregarse, **cuando** el cliente o el administrador miran las listas, **entonces** su fecha de compra y su posición no cambian: la fecha de compra de la contraentrega sigue siendo la de creación del pedido, y solo el pago en línea usa la fecha de pago.

### Cliente

- **Dado** un pedido en curso, **cuando** el cliente abre "Mis pedidos", **entonces** ve una barra con los hitos Pendiente, Confirmado, Preparando, Listo para recoger (Recojo) o En camino (Entrega) y Entregado (Recibido en Recojo se muestra como "Recogido"), y el mensaje del estado actual.
- **Dado** un pedido `RECHAZADO`, `CANCELADO` o `FALLIDO`, **cuando** el cliente lo mira, **entonces** ve el mensaje, el motivo si lo hay y, si está pendiente de reembolso, "Te devolveremos el pago".
- **Dado** un pedido `PENDIENTE`, **cuando** el cliente pulsa "Cancelar pedido" y confirma, **entonces** pasa a `CANCELADO` con motivo "Cancelado por el cliente"; en cualquier otro estado el servidor responde 409 y el botón no se muestra. Un cliente no puede cancelar pedidos ajenos.

### Notificaciones por correo

- **Dado** los estados `PENDIENTE` (el correo de compra existente, que ahora dice "Recibimos tu pedido, esperando confirmación"), `CONFIRMADO`, `EN_PREPARACION`, `LISTO_PARA_RECOGER` o `EN_CAMINO`, y `ENTREGADO`, **cuando** el pedido llega a ese estado, **entonces** el cliente recibe un correo con el mensaje de la tabla.
- **Dado** `LISTO_PARA_ENVIO`, `RECHAZADO`, `CANCELADO` o `FALLIDO`, **cuando** se alcanzan, **entonces** no se envía correo (se ven en "Mis pedidos").
- **Dado** que el correo falla, **cuando** el servidor lo intenta, **entonces** la transición no se revierte; el error solo se registra.

### Panel de administración

- **Dado** la tabla de pedidos, **cuando** la miro, **entonces** el filtro y la columna de estado usan los 10 estados con su nombre en español; "Activos" son los no finales; la columna ordena por el flujo, con los finales negativos al final.
- **Dado** un pedido, **cuando** miro su fila o detalle, **entonces** veo el botón principal con el siguiente paso según su tipo, un botón secundario contextual (Rechazar, Cancelar, "No se entregó") que pide motivo, el motivo guardado y el estado del reembolso.

## Casos borde

- Los pedidos existentes con `EN_PREPARACION`, `EN_CAMINO` o `ENTREGADO` conservan su valor; no se migran datos.
- Pedidos Recojo existentes en `EN_CAMINO` siguen siendo válidos y solo pueden pasar a `ENTREGADO` o `FALLIDO`.
- Un pedido `PENDIENTE_PAGO` o cancelado por vencimiento (pago) no entra al flujo de entrega; sigue su ciclo actual.
- Las notificaciones de estado no incluyen el código de entrega de 4 dígitos.

## Fuera de alcance

- Seguimiento en tiempo real para el cliente (se ve al consultar o recargar).
- Reembolso automático por la API de Mercado Pago.
- Asignación de repartidor.
- Notificaciones del sistema, sonido o SMS.

## Decisiones de clarificación

- **Aceptación manual**: el pedido comprado entra como `PENDIENTE` y el administrador decide.
- **Notificar solo hitos**: Pendiente (correo de compra) → Confirmado → Preparando → Listo para recoger / En camino → Entregado. Los negativos y `LISTO_PARA_ENVIO` no envían correo.
- **Reembolso manual + stock repuesto** para `RECHAZADO`/`CANCELADO` de pagos en línea.
- **Código de entrega**: confirmar la entrega exige el código que ya se genera al comprar (HU-19); sirve para comprobar que quien recibe es la persona correcta.
- **Cancelar**: el cliente solo en `PENDIENTE`; el administrador antes de que el pedido salga (no desde `EN_CAMINO`).
- Esta historia reemplaza las decisiones de HU-32/33 sobre los 3 estados, el mismo flujo para Recojo y la ausencia de avisos al cliente.

## Preguntas abiertas

Ninguna.
