# Spec: HU-39 — Ver y ajustar el carrito desde el ícono del navegador superior

**Épica**: [E3. Carrito de compras](../../docs/epicas.md#e3)
**Estado**: En implementación

## Objetivo

Que un Visitante o Cliente vea, al pasar el cursor sobre el ícono del carrito del navegador superior, una tarjeta con los platos de su carrito, y pueda ajustar cantidades, eliminar platos o vaciar el carrito sin salir de la página en la que está.

## Contexto (qué ya existe y qué falta)

- El ícono del carrito del header (`CartLink`) solo enlaza a `/cart` y muestra la insignia con la cantidad de productos distintos (HU-12).
- El carrito vive en el navegador como lista de `{ productId, quantity }` (HU-12, HU-16). Nombre, imagen, precio y stock de cada plato se leen del catálogo por id, igual que en `/cart`.
- El control de cantidad (**−**, campo, **+**), el botón de eliminar, la notificación al eliminar y el cálculo del subtotal ya existen para `/cart` (HU-13, HU-14). Esta historia los reutiliza en un formato compacto; no cambia sus reglas (límite por stock, llegar a 0 elimina, plato agotado solo baja).
- Vaciar el carrito completo quedó fuera de alcance en HU-13; llega aquí.

## Actor(es)

Visitante y Cliente. No requiere iniciar sesión.

## La tarjeta

Aparece anclada bajo el ícono del carrito, sobre el contenido de la página, y contiene en orden:

1. **Lista de platos**, una fila por plato:
   - **Imagen principal** del plato, pequeña.
   - **Nombre**, en tamaño pequeño y en **una sola línea**, recortado con puntos suspensivos si no cabe.
   - Si el plato está **agotado**, una línea bajo el nombre, en el color de error del design system, que dice "Agotado, no suma al total".
   - **Cantidad** con botones **−** y **+** para disminuirla y aumentarla.
   - Botón **Eliminar**, solo con ícono y con nombre accesible ("Eliminar {nombre} del carrito").
2. **Total** de los platos del carrito (suma de precio por cantidad, con formato `S/ 32.00`). Es el mismo subtotal de `/cart` (HU-14): los platos agotados no suman y no incluye delivery, que se calcula en el checkout (HU-17).
3. Botón **Vaciar carrito**, que quita todos los platos de inmediato, sin confirmación, y muestra una `Notification` ("Vaciamos tu carrito").
4. Botón **Ver carrito**, al pie, que lleva a `/cart`. Es un camino más, además del clic en el ícono.

- Con muchos platos, la lista tiene una altura máxima y se desplaza dentro de la tarjeta; el total y "Vaciar carrito" quedan siempre visibles.
- Se compone con `Card`, `Button` y `IconButton` del `design-system/` y los tokens existentes; no se inventan colores ni tipografías.
- Textos en español, sin emojis.

## Comportamiento al pasar el cursor

- La tarjeta se abre al pasar el cursor sobre el ícono y se mantiene abierta mientras el cursor esté sobre el ícono o sobre la tarjeta (hay que poder moverse del ícono a la tarjeta sin que se cierre).
- Se cierra al sacar el cursor de ambos, con un retardo de 400 ms: evita parpadeos y deja llegar a la tarjeta aunque el cursor se desvíe del ícono.
- Accesible por teclado: se abre también al enfocar el ícono, y **Escape** la cierra. El contenido de la tarjeta se alcanza con Tab.
- Hacer clic en el ícono sigue llevando a `/cart`.
- **No se muestra en `/cart` ni en las pantallas del checkout** (`/checkout/*`): ahí el carrito ya está a la vista y la tarjeta taparía el contenido. En esas rutas el ícono solo enlaza a `/cart`.

## Criterios de aceptación

- **Dado** un carrito con platos, **cuando** paso el cursor sobre el ícono del carrito, **entonces** aparece la tarjeta con una fila por plato.
- **Dado** la tarjeta abierta, **cuando** miro una fila, **entonces** veo la imagen pequeña del plato, su nombre, su precio unitario (`S/ 32.00`), su cantidad con **−** y **+**, y el botón de eliminar.
- **Dado** un plato con un nombre muy largo, **cuando** abro la tarjeta, **entonces** el nombre se recorta con puntos suspensivos en una sola línea y la fila no se desborda.
- **Dado** la tarjeta abierta, **cuando** presiono **+**, **entonces** la cantidad aumenta en 1 y el total se actualiza.
- **Dado** un plato con cantidad 3, **cuando** presiono **−**, **entonces** baja a 2 y el total se actualiza.
- **Dado** un plato con cantidad igual al `stock`, **cuando** miro su fila, **entonces** **+** está deshabilitado.
- **Dado** un plato con cantidad 1, **cuando** presiono **−**, **entonces** la fila se desvanece (el mismo fade de `/cart`) y luego el plato se elimina del carrito, con la notificación "Quitamos {nombre} de tu carrito".
- **Dado** la tarjeta abierta, **cuando** presiono el botón de eliminar de un plato, **entonces** la fila se desvanece como en `/cart` y luego el plato se quita y veo esa notificación; con movimiento reducido (`prefers-reduced-motion`) se quita de inmediato, sin fade.
- **Dado** una fila de la tarjeta, **cuando** miro **−** y **+**, **entonces** son botones cuadrados (32 × 32 px).
- **Dado** la tarjeta abierta, **cuando** miro el total, **entonces** es la suma de precio por cantidad de los platos disponibles (los agotados no suman), con formato `S/ 32.00`, igual que el subtotal de `/cart`.
- **Dado** la tarjeta abierta, **cuando** presiono "Vaciar carrito", **entonces** el carrito queda sin platos, la insignia del ícono desaparece y la tarjeta muestra el estado vacío.
- **Dado** que cambio cantidades, elimino o vacío desde la tarjeta, **cuando** abro `/cart` o recargo la página, **entonces** veo los mismos cambios (misma fuente que HU-13 y HU-16).
- **Dado** que cambio cantidades en `/cart`, **cuando** abro la tarjeta, **entonces** refleja las cantidades vigentes.
- **Dado** la tarjeta abierta, **cuando** muevo el cursor del ícono a la tarjeta, **entonces** no se cierra; **cuando** lo saco de ambos, **entonces** se cierra.
- **Dado** que navego con teclado, **cuando** enfoco el ícono, **entonces** se abre la tarjeta; **cuando** presiono Escape, **entonces** se cierra y el foco queda en el ícono.
- **Dado** un carrito con más platos de los que caben, **cuando** abro la tarjeta, **entonces** la lista se desplaza y el total y "Vaciar carrito" siguen visibles.
- **Dado** la tarjeta abierta, **cuando** presiono "Vaciar carrito", **entonces** veo la notificación "Vaciamos tu carrito" y no se pide confirmación.
- **Dado** la tarjeta abierta, **cuando** presiono "Ver carrito", **entonces** navego a `/cart`.
- **Dado** que estoy en `/cart` o en una pantalla de `/checkout/*`, **cuando** paso el cursor sobre el ícono, **entonces** no aparece la tarjeta.
- **Dado** un carrito vacío, **cuando** paso el cursor sobre el ícono, **entonces** veo el mensaje "Tu carrito está vacío" y no hay total, "Vaciar carrito" ni "Ver carrito".
- **Dado** un plato agotado en el carrito, **cuando** miro su fila, **entonces** **+** está deshabilitado y puedo quitarlo con **−** o con el botón de eliminar.
- **Dado** un plato agotado en el carrito, **cuando** miro su fila, **entonces** veo bajo el nombre, en una línea y en color de error, "Agotado, no suma al total"; y un plato disponible no muestra esa línea.

## Casos borde

- **Datos de los platos aún cargando** (nombre, imagen, precio, stock): la fila muestra un estado de carga y no ofrece el control hasta conocer el stock; el total no se muestra hasta tener todos los precios.
- **Plato inexistente o inactivo**: se quita del carrito sin aviso, como en `/cart` (HU-12).
- **Imagen que no carga o plato sin imagen**: se usa la imagen de reemplazo que ya usa el catálogo.
- **Clics rápidos** en **+** o **−**: cada clic cuenta; la cantidad nunca baja de 0 ni supera el `stock`.
- **Dispositivo táctil** (sin hover): fuera de alcance mientras no exista la vista móvil; el ícono sigue yendo a `/cart`.
- **Quitar el último plato** con la tarjeta abierta: pasa al estado vacío sin cerrarse de golpe.
- **Ventana angosta**: la tarjeta no se sale de la pantalla.

## Fuera de alcance

- Layout y comportamiento para celular y dispositivos táctiles (aún no existe la vista móvil), igual que HU-07 y HU-08.
- Confirmación previa a vaciar el carrito.
- Editar la cantidad escribiendo en un campo dentro de la tarjeta (en la tarjeta solo hay botones **−** y **+**; escribir sigue en `/cart` y el detalle).
- Deshacer una eliminación o el vaciado.
- Notas por plato (HU-15), delivery y checkout (HU-14, HU-17).
- Cambios en el stock, su reserva o su validación al pagar.

## Impacto en documentación

- `docs/epicas.md` y `docs/historias.md`: se agrega HU-39 en E3.
- `docs/diagrama-de-casos-de-uso.md`: se menciona HU-39 en "Gestionar carrito".
- `specs/hu-13-modificar-cantidad-carrito/spec.md`: "vaciar el carrito" figuraba fuera de alcance; pasa a cubrirse aquí (no requiere cambios en esa spec).
- `design-system/`: no hay componente de tarjeta emergente; se arma con `Card`, `Button` e `IconButton`.

## Decisiones de clarificación

- **Rutas sin tarjeta**: se oculta en `/cart` y en `/checkout/*`.
- **Táctil**: no se resuelve aquí; depende de la vista móvil, que aún no existe.
- **Vaciar carrito**: sin confirmación; solo notifica ("Vaciamos tu carrito").
- **Ver carrito**: la tarjeta incluye un botón al pie que lleva a `/cart`.
- **Total**: es el subtotal de los platos, sin delivery, porque aún no se eligió dirección.

## Preguntas abiertas

Ninguna.
