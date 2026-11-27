# Spec: HU-42 — Aplicar un cupón de descuento al pagar

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada ingrese un código de descuento (cupón) durante el checkout, vea el descuento reflejado en el resumen antes de pagar y que el pedido se cree con ese descuento, tanto con pago en línea como contraentrega.

## Contexto (qué ya existe y qué falta)

- La columna `orders.discount` existe desde HU-19 y hoy siempre vale `0`. El resumen del pedido (HU-14) ya muestra la fila **Descuento** en `S/ 0.00` (constante `DISCOUNT` en `order-summary.ts`).
- El panel de pedidos (HU-32/HU-33), el historial y el detalle del cliente (HU-25, HU-40) y el reporte de ventas (HU-34) ya muestran o suman `discount`: no necesitan cambios de lógica, solo empezarán a ver valores distintos de cero.
- El backend recalcula todos los importes al crear el pedido (HU-17, HU-19, HU-20); el descuento también se calcula en el servidor y nunca se recibe del cliente.
- **No existen** cupones en el backend: esta historia crea su modelo de datos. Crear, editar y desactivar cupones desde el panel es una **historia posterior del panel de administración** (E6), fuera de esta.

## Actor(es)

Cliente con sesión iniciada, en el checkout.

## Qué es un cupón

Un código de texto (por ejemplo `CEVICHE10`) con:

- **Tipo de descuento**: porcentaje sobre el subtotal de los platos (`10 %`) o monto fijo en soles (`S/ 5.00`).
- **Vigencia**: fecha de inicio y de fin (opcionales).
- **Monto mínimo de compra** (opcional), medido sobre el subtotal de los platos.
- **Límite de usos total** (opcional) y **límite de usos por cliente** (opcional).
- **Activo / inactivo**.

El descuento se aplica solo al **subtotal de los platos**, nunca al delivery, y nunca supera ese subtotal (el total mínimo es el costo de delivery).

## Criterios de aceptación

### Ingresar el cupón

- **Dado** un cliente en el paso Pago, **cuando** mira el resumen, **entonces** ve un campo "Código de descuento" con un botón "Aplicar".
- **Dado** un código válido para el cliente y su carrito, **cuando** pulsa "Aplicar", **entonces** la fila Descuento muestra el monto (`-S/ 8.25`, igual que el panel) con el código aplicado, y el total se recalcula.
- **Dado** un cupón aplicado, **cuando** el cliente pulsa "Quitar", **entonces** el descuento vuelve a `S/ 0.00` y el total se recalcula.
- **Dado** el campo de código, **cuando** el cliente escribe en minúsculas o con espacios alrededor, **entonces** el código se compara sin distinguir mayúsculas y sin esos espacios.
- **Dado** que pulsé "Aplicar", **cuando** espero la respuesta, **entonces** el botón queda en carga y no se envía dos veces.
- Solo se puede aplicar **un cupón por pedido**.

### Cupón rechazado

- **Dado** un código que no existe o está inactivo, **cuando** pulso "Aplicar", **entonces** veo "Este código no es válido" bajo el campo y no se aplica descuento.
- **Dado** un cupón fuera de su vigencia, **cuando** lo aplico, **entonces** veo "Este código ya venció" (o "aún no está disponible" si no empezó).
- **Dado** un carrito cuyo subtotal no llega al mínimo del cupón, **cuando** lo aplico, **entonces** veo "Este código es válido desde una compra de S/ 40.00".
- **Dado** un cupón que agotó su límite total o mi límite por cliente, **cuando** lo aplico, **entonces** veo "Ya no puedes usar este código".

### Crear el pedido con descuento

- **Dado** un cupón aplicado, **cuando** el cliente pulsa "Pagar" (en línea) o "Confirmar pedido" (contraentrega), **entonces** el backend **vuelve a validar** el cupón con el carrito vigente, recalcula el descuento y guarda el pedido con `discount` y el cupón usado.
- **Dado** que el cupón dejó de ser válido entre "Aplicar" y "Pagar" (venció, se agotó, el carrito bajó del mínimo), **cuando** se crea el pedido, **entonces** se rechaza con el mensaje correspondiente, el cliente se queda en el paso Pago y el cupón se quita del resumen.
- **Dado** un pago en línea, **cuando** se crea la preferencia de Mercado Pago, **entonces** el monto cobrado es el total con el descuento ya restado.
- **Dado** un cupón con límite de usos, **cuando** se crea un pedido con él (en línea o contraentrega), **entonces** cuenta como uso; si el pedido se cancela sin haberse comprado (pago en línea vencido, reemplazado o con error de pasarela), el uso se libera.
- **Dado** un pedido comprado con cupón (pagado o contraentrega), **cuando** después se rechaza o cancela su entrega, **entonces** el uso **no** se libera.

### Después de comprar

- **Dado** un pedido con cupón, **cuando** el cliente ve la confirmación (HU-21), el correo de confirmación o el detalle del pedido (HU-40), **entonces** ve la fila Descuento con el monto y el código usado.
- **Dado** un pedido con cupón, **cuando** el cliente lo ve en su historial (HU-25), **entonces** el precio mostrado es el total con el descuento ya restado.
- **Dado** un pedido con cupón, **cuando** el administrador abre su detalle en el panel (HU-32), **entonces** ve el descuento con el código usado.

## Casos borde

- **Carrito modificado** con un cupón aplicado (otra pestaña o "Volver" al carrito): el descuento se recalcula en el resumen; si el carrito deja de cumplir el mínimo, el cupón se quita y se avisa.
- **Cupón porcentual con decimales**: el descuento se redondea a 2 decimales (céntimos) en el servidor, y el frontend muestra el valor que devuelve el servidor.
- **Cupón de monto fijo mayor al subtotal**: el descuento se limita al subtotal.
- **Dos pedidos simultáneos** del mismo cliente con un cupón de un solo uso: solo uno lo consume; el otro se rechaza.
- **Fuerza bruta de códigos**: se limita la cantidad de intentos de validación por cliente en un intervalo.
- **Recarga de la pantalla**: lleva a `/cart` como en HU-18 y se pierde el cupón aplicado.

## Fuera de alcance

- Crear, editar, desactivar y ver el uso de los cupones desde el panel (historia posterior de E6).
- Promociones automáticas sin código y platos destacados (HU-11).
- Cupones por plato o categoría, de envío gratis, combinables, o asignados a un cliente concreto.
- Aplicar el cupón en la pantalla del carrito (`/cart`) o en el mini carrito (HU-39).
- Layout para celular, igual que el resto del checkout.

## Impacto en documentación

- `docs/historias.md`, `docs/epicas.md` y `docs/cronograma.md`: HU-42.
- `docs/diagrama-de-base-de-datos.md`: tabla de cupones y la relación pedido–cupón (nueva migración Flyway).
- `specs/hu-14-ver-resumen-del-pedido/`: la fila Descuento deja de ser constante.
- `frontend/src/features/checkout/README.md` y `frontend/src/features/carrito/README.md`.

## Decisiones de clarificación

- **Dónde se ingresa el cupón**: en el paso **Pago** del checkout, con sesión iniciada (los límites por cliente necesitan saber quién es). No en `/cart`.
- **Cupones antes del panel**: cupones de ejemplo cargados solo en desarrollo; en producción se insertan a mano en la base hasta que exista la historia del panel.
- **Sin tope en soles** para los cupones porcentuales en esta historia.
- **Uso en contraentrega**: cuenta al crear el pedido; si luego se rechaza o cancela desde el panel, el uso no se libera.
- **Registro en el pedido**: se guarda el cupón usado (referencia y copia del código) además del monto, para mostrarlo al cliente y en el panel.

## Preguntas abiertas

Ninguna.
