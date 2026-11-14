# Spec: HU-20 — Detallar el pago contraentrega (efectivo o billetera Yape)

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada que eligió **Contraentrega** indique, en un formulario que se abre en el mismo paso Pago, **cómo pagará al recibir** (efectivo o billetera Yape) y, si es efectivo, **con cuánto** pagará, para que el repartidor venga preparado con el vuelto o sepa que le pagarán por billetera. Al confirmar, se crea el pedido.

## Contexto (qué ya existe y qué falta)

- HU-18 entrega el paso Pago (`/checkout/pago`) con las dos opciones y deja **Contraentrega** sin acción: el botón principal está deshabilitado con ella.
- HU-19 creó los pedidos, el código de pedido, el código de entrega y el pago en línea. Su endpoint de creación ya acepta `paymentMethod = CONTRAENTREGA`, pero hoy no guarda ningún detalle de cobro y no existe un estado de pedido para "pago pendiente al recibir" (los estados actuales son `PENDIENTE_PAGO`, `PAGADO`, `CANCELADO`, pensados para el pago en línea).
- HU-21 (confirmación con número de pedido y correo) es posterior. Esta historia lleva al cliente a la pantalla de resultado de HU-19 y HU-21 la completa.
- El carrito vive solo en el navegador; el backend recalcula precios, delivery y total al crear el pedido (HU-17, HU-19).

## Actor(es)

Cliente con sesión iniciada.

## Formulario de contraentrega

Al elegir **Contraentrega** en el paso Pago se despliega, debajo de las opciones y sin cambiar de ruta, el formulario **Detalle del pago contraentrega**. Con **Pago en línea** o sin selección no se muestra. Los datos escritos se conservan si el cliente alterna entre métodos sin salir del paso.

### Campos

- **Cómo pagarás** (obligatorio): selector de una opción entre:
  - **Efectivo**
  - **Yape** (billetera digital)
  Sin selección por defecto.
- **¿Con cuánto pagarás?** (opcional): monto en soles, solo visible con **Efectivo**. Si se llena, debe ser mayor o igual al total del pedido; se muestra el **vuelto** calculado (`Vuelto: S/ 15.00`). Si se deja vacío, se entiende que paga con el monto exacto o que el repartidor verá el vuelto en el momento.

Los textos se adaptan a la entrega: con **Recojo en tienda** el título pasa a "Detalle del pago al recoger" y las indicaciones hablan de "al recoger" en lugar de "el repartidor".

### Botón principal

Con **Contraentrega** elegida, el botón principal pasa a **Confirmar pedido** y muestra el total (`Confirmar pedido S/ 85.00`); queda habilitado solo cuando el formulario es válido (cómo pagarás elegido y, si hay monto, válido). Al pulsarlo se deshabilita y muestra carga hasta que el pedido se crea, para evitar duplicados por doble clic.

## Criterios de aceptación

### Formulario

- **Dado** que estoy en el paso Pago, **cuando** elijo **Contraentrega**, **entonces** se abre el formulario con el selector "Cómo pagarás" sin ninguna opción elegida.
- **Dado** que elijo **Pago en línea** o no he elegido método, **cuando** miro la pantalla, **entonces** el formulario no se muestra.
- **Dado** el formulario abierto, **cuando** no he elegido cómo pagaré, **entonces** "Confirmar pedido" está deshabilitado.
- **Dado** el formulario abierto, **cuando** elijo **Yape**, **entonces** no aparece el campo de monto y "Confirmar pedido" queda habilitado.
- **Dado** el formulario abierto, **cuando** elijo **Efectivo**, **entonces** aparece el campo "¿Con cuánto pagarás?" marcado como opcional y "Confirmar pedido" queda habilitado aunque esté vacío.
- **Dado** que elijo Efectivo y escribo un monto menor al total, **cuando** salgo del campo o intento confirmar, **entonces** veo el error "El monto debe ser al menos S/ 85.00" y no se puede confirmar.
- **Dado** que escribo un monto mayor o igual al total, **cuando** lo veo, **entonces** se muestra el vuelto calculado con formato `S/ 15.00`.
- **Dado** que escribo un monto con más de dos decimales, negativo, cero o no numérico, **cuando** intento confirmar, **entonces** veo un error y no se confirma.
- **Dado** que escribí un monto y luego cambio a Yape, **cuando** confirmo, **entonces** el monto no se envía ni se guarda.
- **Dado** que alterno entre Pago en línea y Contraentrega sin salir del paso, **cuando** vuelvo a Contraentrega, **entonces** conservo lo que había elegido y escrito.
- **Dado** que elegí Recojo en tienda en el paso anterior, **cuando** veo el formulario, **entonces** los textos hablan de pagar al recoger.

### Crear el pedido

- **Dado** un formulario válido, **cuando** pulso "Confirmar pedido", **entonces** se crea el pedido con los platos del carrito, el detalle de cobro elegido y es llevado a la pantalla de resultado.
- **Dado** que pulsé "Confirmar pedido", **cuando** espero la respuesta, **entonces** el botón está deshabilitado y en carga, y un segundo clic no crea otro pedido.
- **Dado** que el backend rechaza la creación (stock, disponibilidad, cobertura, monto menor al total), **cuando** ocurre, **entonces** me quedo en el paso Pago con un aviso de error abajo a la derecha (el del servidor si lo hay) y puedo corregir y reintentar.
- **Dado** que el carrito cambió en otra pestaña, **cuando** pulso "Confirmar pedido", **entonces** se usa el carrito vigente y el monto declarado se valida contra el total recalculado.
- **Dado** un pedido contraentrega creado, **cuando** se guarda, **entonces** descuenta el stock de cada plato, recibe su código de pedido y su código de entrega (HU-19) y queda en un estado **confirmado, con pago pendiente al recibir**, que no vence por tiempo como el pedido en línea.

### Validación en el servidor

- **Dado** un pedido contraentrega sin medio de cobro, **cuando** llega al backend, **entonces** se rechaza.
- **Dado** Yape con monto informado, **cuando** llega al backend, **entonces** el monto se ignora y no se guarda.
- **Dado** Efectivo con monto menor al total recalculado por el servidor (incluido el delivery), **cuando** llega al backend, **entonces** se rechaza con un mensaje claro.
- **Dado** Efectivo con monto mayor o igual al total, **cuando** se crea el pedido, **entonces** se guarda el monto declarado y el vuelto se calcula siempre desde él y el total, nunca se acepta del cliente.
- **Dado** un monto absurdo (por ejemplo más de `S/ 10,000.00`), **cuando** llega al backend, **entonces** se rechaza.
- **Dado** un pedido con **Pago en línea**, **cuando** llega con detalle de contraentrega, **entonces** se ignora o se rechaza, sin guardarse.

### Resultado

- **Dado** que se creó mi pedido contraentrega, **cuando** llego a la pantalla de resultado, **entonces** veo "Recibimos tu pedido" con el código de pedido, el código de entrega (con la indicación "Díselo al repartidor al recibir tu pedido", o "al recoger" con Recojo), el medio con el que pagaré y, con Efectivo y monto, "Pagarás con S/ 100.00 (vuelto S/ 15.00)".
- **Dado** que se creó mi pedido contraentrega, **cuando** llego al resultado, **entonces** mi carrito queda vacío (a diferencia del pago en línea, no hay nada que esperar).
- **Dado** que recargo la pantalla de resultado, **cuando** carga, **entonces** veo el estado actual del pedido con el mismo detalle.
- **Dado** el pedido contraentrega de otro cliente o inexistente, **cuando** lo consulto, **entonces** veo que no se encontró, sin revelar si existe.

### Seguridad

- **Dado** cualquier llamada sin sesión de Cliente, **cuando** llega al backend, **entonces** se rechaza (`401`/`403`), y un cliente solo ve sus propios pedidos.
- **Dado** que el cliente envía importes o el vuelto, **cuando** llegan al backend, **entonces** no se confía en ellos: el servidor recalcula el total y el vuelto.

## Casos borde

- **Total que cambia después de declarar el monto** (por ejemplo, el carrito se modifica en otra pestaña): el servidor compara el monto con el total recalculado y rechaza si quedó por debajo.
- **Monto exacto al total**: es válido, el vuelto es `S/ 0.00`.
- **Doble clic o reintento tras error de red**: no debe crear dos pedidos; con respuesta ambigua, el cliente ve el pedido en el resultado y no se duplica.
- **Pedido pendiente de pago en línea previo**: al confirmar un pedido contraentrega, un pedido en línea pendiente del mismo cliente se cancela y libera su stock, igual que el reintento de HU-19.
- **Recarga del paso Pago**: lleva a `/cart` y se pierde lo escrito, igual que HU-18.
- **Cambiar el tipo de entrega** con "Volver": el método y el formulario se conservan salvo que el cambio de entrega los invalide (HU-18); el vuelto se recalcula con el nuevo total.
- **Administrador** que llega a estas rutas: se rechaza (el checkout es de Cliente).
- **Pedido contraentrega nunca cobrado**: cancelarlo, marcarlo pagado al entregar y devolver el stock son del panel de administración (E6).

## Fuera de alcance

- Marcar el pedido como entregado y cobrado, verificando el código de entrega (panel de administración, E6).
- Correo y pantalla de confirmación completa con el detalle del pedido (HU-21, ya conectada: ver `specs/hu-21-confirmacion-del-pedido/`).
- Pago rechazado y reintentos del pago en línea (HU-22).
- Cobrar con Yape desde la aplicación: solo se registra la intención; el cobro lo hace el repartidor.
- Número de Yape del negocio o código QR para pagar: no se muestran en esta historia.
- Restricciones de monto máximo o zonas especiales para contraentrega (HU-18 decidió no tenerlas).
- Ver o repetir pedidos desde el perfil (E5).
- Layout para celular, igual que el resto del checkout.

## Impacto en documentación

- `docs/diagrama-de-base-de-datos.md` (+ imagen): detalle de cobro contraentrega en el pedido (medio, monto declarado) y nuevo estado del pedido.
- `docs/historias.md` y `docs/cronograma.md`: estado de HU-20.
- `specs/hu-18-metodo-de-pago/spec.md` y `specs/hu-19-pago-en-linea/spec.md`: nota de que Contraentrega ya se conecta con esta historia.
- `frontend/src/features/checkout/README.md`: formulario de contraentrega y cambios del resultado.
- Requiere migración de base de datos (Flyway) para el detalle de cobro y el estado nuevo.

## Decisiones de clarificación

- **Medios de cobro**: solo **Efectivo** y **Yape** (billetera). No se ofrece POS ni otras billeteras.
- **Estado del pedido contraentrega**: nuevo estado `PENDIENTE_COBRO` ("confirmado, se paga al recibir"), distinto de `PAGADO` y sin vencimiento; pasa a `PAGADO` cuando el administrador marca la entrega (E6).
- **Monto menor al total**: error; no se puede confirmar.
- **Monto máximo**: `S/ 10,000.00`, solo como defensa contra valores absurdos, no como regla de negocio.
- **Resumen del cobro**: se muestra solo en el resultado de esta historia; verlo en el historial es de E5.

## Preguntas abiertas

Ninguna.
