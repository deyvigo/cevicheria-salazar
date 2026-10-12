# Spec: HU-13 — Modificar la cantidad o eliminar platos del carrito

**Épica**: [E3. Carrito de compras](../../docs/epicas.md#e3)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente pueda cambiar la cantidad de un plato, o quitarlo, directamente desde el detalle del plato y desde `/cart`, para ajustar su pedido sin tener que volver a armarlo.

## Contexto (qué ya existe y qué falta)

- HU-12 dejó el carrito en el navegador (lista de `{ productId, quantity }`), el botón "Agregar al carrito" en el detalle y en las tarjetas, y la pantalla `/cart` con la cantidad **solo de lectura**. Esta historia la vuelve editable.
- El límite de cantidad de un plato es su `stock` (HU-12). Un plato agotado se mantiene en el carrito con la insignia "Agotado" y el aviso "Este plato está agotado. Quítalo o elige otro de la carta."; HU-12 dejó pendiente el control para quitarlo, que llega aquí.
- Subtotal, delivery y total son HU-14; la nota por plato es HU-15.

## Actor(es)

Visitante y Cliente. Nada de esto requiere iniciar sesión.

## Control de cantidad

Un mismo control en el detalle y en `/cart`, formado por tres partes en una fila: botón **−**, campo numérico, botón **+**.

- El campo muestra la cantidad actual del plato en el carrito y acepta **solo números enteros** (sin decimales, signos ni letras). Se puede cambiar con los botones o escribiendo con el teclado.
- **+** suma 1; **−** resta 1.
- **+** está deshabilitado cuando la cantidad ya es igual al `stock` del plato.
- Escribir un número: la cantidad se aplica al confirmar (Enter o al salir del campo), no en cada pulsación. Mientras se escribe, el campo puede estar vacío sin que el plato se quite.
  - Mayor que el `stock`: se recorta al `stock`.
  - `0`: el plato se elimina del carrito (igual que llegar a 0 con **−**).
  - Vacío o no numérico al confirmar: el campo vuelve a la cantidad anterior; no cambia nada.
- Es accesible: los botones tienen nombre ("Quitar una unidad de {nombre}", "Agregar una unidad de {nombre}"), el campo tiene etiqueta con el plato, y todo se alcanza con Tab y se opera con teclado. Usa los tokens del design system (`Input` y `Button`); no se inventan estilos.

## Formas de eliminar

1. **Botón "Eliminar"**, visible **solo en `/cart`**, en cada fila. Quita el plato de inmediato, sin confirmación.
2. **Llegar a 0** con el botón **−** (o escribiendo `0`), en `/cart` y en el detalle. Quita el plato igual que el botón.

Al eliminar, por cualquiera de las dos formas, el plato sale del carrito, la insignia del header se actualiza y se muestra una `Notification` ("Quitamos {nombre} de tu carrito"). Los cambios de cantidad que no eliminan el plato no muestran notificación.

## Pantallas

### Detalle del plato (`/products/{id}`)

- Si el plato **no está** en el carrito: se ven **a la vez** el control de cantidad y el botón "Agregar al carrito". El control parte en 1 y sirve para elegir cuántas unidades agregar; al presionar el botón se agrega **la cantidad que muestre el control**. Antes de agregar, el control no toca el carrito. Aquí el mínimo es 1 (no hay nada que eliminar): **−** está deshabilitado en 1, y escribir `0`, vacío o texto devuelve el campo a su valor anterior. El máximo es el `stock`.
- Si el plato **está** en el carrito: el botón desaparece y queda solo el control de cantidad, que ahora refleja y modifica la cantidad del carrito. Llegar a 0 quita el plato, y vuelven a mostrarse el control (en 1) y el botón "Agregar al carrito".
- Elegir la cantidad antes de agregar existe **solo en el detalle**; las tarjetas del catálogo siguen agregando 1.
- No hay botón "Eliminar" en el detalle.
- Con el plato agotado o con la disponibilidad sin confirmar, el botón de agregar sigue deshabilitado como en HU-12. Si el plato agotado ya estaba en el carrito, el control se muestra con **+** deshabilitado y **−** funcional, para poder quitarlo.
- Si el carrito ya tiene todo el `stock`, **+** está deshabilitado y se mantiene el texto de apoyo "Ya tienes todo el stock disponible en tu carrito".

### Carrito (`/cart`)

- Cada fila muestra el control de cantidad en lugar del número de solo lectura, y a su lado el botón "Eliminar".
- En una fila de plato agotado, **+** está deshabilitado y "Eliminar" está disponible, de modo que el aviso "Este plato está agotado. Quítalo o elige otro de la carta." ya tiene una acción.
- Al quitar el último plato, la pantalla pasa al estado vacío ("Tu carrito está vacío" y "Ver la carta"; "Compartir" deja de estar disponible).
- Los cambios se reflejan al instante en la fila y en la insignia del header; no hay botón "Guardar".

## Criterios de aceptación

- **Dado** un plato en el carrito, **cuando** presiono **+**, **entonces** su cantidad aumenta en 1.
- **Dado** un plato con cantidad 3, **cuando** presiono **−**, **entonces** su cantidad baja a 2.
- **Dado** un plato con cantidad 1, **cuando** presiono **−**, **entonces** el plato se elimina del carrito y veo la confirmación.
- **Dado** un plato en el carrito, **cuando** escribo `5` en el campo y confirmo, **entonces** la cantidad pasa a 5 (si el stock lo permite).
- **Dado** un plato con `stock = 4`, **cuando** escribo `50` y confirmo, **entonces** la cantidad queda en 4.
- **Dado** un plato con cantidad igual al `stock`, **cuando** miro el control, **entonces** **+** está deshabilitado.
- **Dado** un plato en el carrito, **cuando** escribo `0` y confirmo, **entonces** el plato se elimina del carrito.
- **Dado** el campo de cantidad, **cuando** lo dejo vacío o escribo texto y confirmo, **entonces** vuelve a la cantidad anterior y el plato no se quita.
- **Dado** el campo de cantidad, **cuando** intento escribir un decimal, un signo o letras, **entonces** esos caracteres no se aceptan.
- **Dado** que estoy en `/cart`, **cuando** hago clic en "Eliminar" de una fila, **entonces** el plato se quita del carrito de inmediato.
- **Dado** que estoy en el detalle de un plato, **cuando** miro la pantalla, **entonces** no veo botón "Eliminar".
- **Dado** que estoy en el detalle de un plato que no está en el carrito, **cuando** lo miro, **entonces** veo el control de cantidad en 1 y el botón "Agregar al carrito".
- **Dado** que en ese detalle el control marca 3, **cuando** presiono "Agregar al carrito", **entonces** el plato queda en el carrito con cantidad 3, el botón desaparece y el control refleja la cantidad del carrito.
- **Dado** que en ese detalle cambio el control sin presionar "Agregar al carrito", **cuando** miro el ícono del carrito o abro `/cart`, **entonces** el carrito no cambió.
- **Dado** que en ese detalle el control marca 1, **cuando** miro **−**, **entonces** está deshabilitado y escribir `0` devuelve el campo a 1.
- **Dado** que en ese detalle escribo una cantidad mayor que el `stock`, **cuando** confirmo, **entonces** el control queda en el `stock`.
- **Dado** que estoy en el detalle de un plato que ya está en el carrito, **cuando** lo miro, **entonces** veo solo el control con la cantidad actual, sin botón "Agregar al carrito".
- **Dado** que estoy en el detalle de un plato con cantidad 1 en el carrito, **cuando** presiono **−**, **entonces** el plato se quita, veo la notificación y vuelven el control (en 1) y el botón "Agregar al carrito".
- **Dado** que cambio la cantidad de un plato sin eliminarlo, **cuando** el cambio se aplica, **entonces** no aparece ninguna notificación.
- **Dado** que cambio la cantidad de un plato en `/cart`, **cuando** abro su detalle, **entonces** veo la misma cantidad (y viceversa).
- **Dado** que cambio cantidades o elimino platos, **cuando** miro el ícono del carrito, **entonces** la insignia refleja la cantidad de productos distintos vigente.
- **Dado** que quito el último plato en `/cart`, **cuando** la fila desaparece, **entonces** veo "Tu carrito está vacío" y el enlace a la carta.
- **Dado** un plato agotado en el carrito, **cuando** miro su fila, **entonces** **+** está deshabilitado y puedo quitarlo con "Eliminar" o con **−**.
- **Dado** que modifiqué cantidades, **cuando** recargo la página o vuelvo a abrir la tienda en el mismo navegador, **entonces** el carrito conserva los cambios.
- **Dado** que modifiqué cantidades, **cuando** presiono "Compartir", **entonces** el enlace codifica las cantidades vigentes.

## Casos borde

- **Stock bajó después de agregar**: `/cart` ya muestra la cantidad ajustada al stock (HU-12); el control parte de ese valor y **+** queda deshabilitado si es igual al stock.
- **Stock `0`** con plato en el carrito: la cantidad máxima es 0, **+** deshabilitado; el cliente solo puede quitarlo.
- **Número muy grande** (por ejemplo `99999999999999999999`): se trata como mayor que el stock y se recorta; no produce error ni valores inválidos.
- **Ceros a la izquierda** (`007`): se interpreta como 7.
- **Clics rápidos** en **+** o **−**: cada clic cuenta; la cantidad nunca queda por debajo de 0 ni por encima del stock.
- **Dos pestañas abiertas**: el cambio en una se refleja en la otra (comportamiento de sincronización de HU-12).
- **Datos de `/cart` aún cargando** (nombre, precio, stock): no se ofrece el control hasta conocer el stock; la fila muestra el estado de carga de HU-12.
- **Plato inexistente o inactivo**: se quita del carrito sin aviso (HU-12); no es una eliminación del cliente y no muestra la notificación de esta historia.
- **`localStorage` no disponible**: los cambios funcionan en memoria durante la sesión de la pestaña (HU-12).
- **Teclado**: Enter en el campo confirma sin enviar ningún formulario ni navegar.

## Fuera de alcance

- Vaciar el carrito completo con un solo botón.
- Deshacer una eliminación.
- Confirmación previa a eliminar.
- Control de cantidad en las tarjetas del catálogo (siguen con el botón "Agregar" de HU-12, que agrega 1).
- Subtotal, delivery y total por cantidad (HU-14).
- Nota por plato (HU-15).
- Cualquier cambio en el stock, su reserva o su validación al pagar (checkout).
- Layout para celular, igual que HU-07 y HU-08.

## Impacto en documentación

- `specs/hu-12-agregar-al-carrito/spec.md`: la cantidad de solo lectura y el aviso del plato agotado ya anticipaban esta historia; no requiere cambios.
- `specs/hu-08-ver-detalle-plato/spec.md`: el espacio del botón de agregar en el detalle puede pasar a mostrar el control de cantidad (ver Decisiones de clarificación).
- `design-system/`: el control de cantidad no existe como componente.

## Decisiones de clarificación

- **Detalle, plato fuera del carrito**: se muestran control de cantidad y botón "Agregar al carrito"; el botón agrega la cantidad del control. Solo en el detalle. Con el plato en el carrito, queda solo el control.
- **View transition**: el botón de la tarjeta sigue viajando al botón "Agregar al carrito" del detalle cuando el plato no está en el carrito. Si ya está, el control aparece sin animación de ese elemento y el resto de la transición (imagen, nombre, precio) no cambia.
- **View transition del control**: el control de cantidad de la fila de `/cart` es un elemento compartido con el del detalle, igual que imagen, nombre y precio (HU-08/HU-12): al abrir el detalle desde la fila viaja hasta el control del detalle y vuelve al regresar. Solo la fila clicada lleva el identificador. Desde una tarjeta del catálogo no hay par (la tarjeta no tiene control), así que aparece sin animación de ese elemento. Con movimiento reducido o sin soporte de *view transitions* no hay animación.
- **Componente**: el control de cantidad se arma con `Button` e `Input` y los tokens existentes, como componente propio del frontend.
- **Notificación**: solo al eliminar un plato (por "Eliminar" o llegando a 0). Los cambios de cantidad que no eliminan no notifican.

## Preguntas abiertas

Ninguna.
