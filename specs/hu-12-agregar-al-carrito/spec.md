# Spec: HU-12 — Agregar platos al carrito

**Épica**: [E3. Carrito de compras](../../docs/epicas.md#e3)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente pueda agregar platos al carrito desde el detalle, ver qué lleva en una pantalla `/cart` y compartir ese carrito con otra persona mediante un enlace, para armar el pedido sin necesidad de tener cuenta.

## Contexto (qué ya existe y qué falta)

- El detalle del plato (`/products/{id}`, HU-08) reserva el espacio bajo el precio para el botón de agregar, y HU-10 dejó dicho que ese botón debe deshabilitarse cuando el plato está agotado (`available = false`).
- El header (`src/components/header.tsx`) tiene logo, buscador y, a la derecha, "Iniciar sesión" o el menú del usuario. No hay ícono de carrito.
- Existe un `CartContext` provisional (`src/context/cart-context.tsx`, guarda `platoId`, `nombre`, `precio`, `cantidad`, `nota` en `localStorage`) que nada usa todavía. Esta historia lo reemplaza por un store de **Zustand** (decisión del usuario; hay que actualizar la línea "Estado global" de `AGENTS.md`, que hoy dice Context API).
- Las tarjetas del catálogo (HU-07) son un enlace entero al detalle y se animan con *view transition* (HU-08). El listado `GET /api/products` no trae disponibilidad (decisión de HU-10); esta historia lo cambia porque las tarjetas necesitan saber si el plato se puede agregar.
- Hoy no existe stock: solo `available` (HU-10). Esta historia agrega el stock al plato para limitar lo que se puede pedir.
- El carrito vive en el navegador; no hay tablas ni endpoints de escritura del carrito.

## Actor(es)

Visitante y Cliente. Nada de esto requiere iniciar sesión.

## Modelo de datos

### Producto (plato): atributo nuevo

| Atributo | Descripción                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `stock`  | Unidades que se pueden pedir hoy (`stock` en BD, entero mayor o igual que 0). Los platos existentes parten con un valor de semilla. |

- Un plato se puede pedir solo si `available = true` **y** `stock > 0`. Con `stock = 0` el plato se muestra como "Agotado" aunque `available` sea `true` (el indicador de HU-10 usa esta regla combinada).
- La cantidad máxima de un plato en el carrito es su `stock`.
- El backend expone `stock` y `available` en el listado y en el detalle del plato. El frontend los usa solo para la lógica del botón y los límites de cantidad; en el listado no se muestran al cliente.
- Quién modifica el stock es el panel de administración (HU-29/HU-30), y descontarlo al confirmar un pedido es del checkout. Aquí solo existe la columna, su lectura y datos de semilla; hasta entonces se cambia por semilla o directamente en base de datos.

## Modelo del carrito

Una lista de ítems `{ productId, quantity }`.

- Un plato aparece una sola vez; agregarlo de nuevo suma a su cantidad, sin superar su `stock`.
- El carrito guarda solo ids y cantidades, no nombre ni precio: esos datos se piden al servidor al mostrar `/cart`, de modo que el precio mostrado siempre es el vigente y un enlace compartido no puede traer precios inventados.
- El carrito se guarda en `localStorage` (a través del middleware `persist` de Zustand) para que sobreviva a recargas y a cerrar la pestaña.

## Pantallas

### Header

Un ícono de carrito (bolsa o carrito, SVG, con `aria-label="Carrito"`) a la **izquierda** de "Iniciar sesión" (o del menú del usuario si hay sesión). Es un enlace a `/cart`. Si el carrito tiene platos, lleva en su esquina superior derecha un círculo pequeño (insignia) con la **cantidad de productos distintos** del carrito, es decir, el número de platos diferentes y no la suma de unidades: 2 de ceviche y 1 de chicharrón cuentan 2. Sin platos, no hay insignia. La insignia usa los tokens del design system (no se inventan colores), el texto es legible con dos cifras y su significado no depende solo del color; el enlace tiene nombre accesible con la cifra ("Carrito, 2 productos").

### Detalle del plato (`/products/{id}`)

Botón primario "Agregar al carrito" bajo el precio (el espacio reservado en HU-08). Debe usar `Button` del design system.

- Mientras no se confirmó la disponibilidad (`available = null`, ver HU-10) el botón está deshabilitado, igual que cuando el plato está agotado (`available = false` o `stock = 0`).
- Si el carrito ya tiene todo el `stock` del plato, el botón está deshabilitado y un texto de apoyo dice "Ya tienes todo el stock disponible en tu carrito".
- Al agregar, aparece una `Notification` de éxito ("Agregamos {nombre} a tu carrito") con enlace "Ver carrito". Sin redirección automática.

### Tarjeta del catálogo (`/menu`, `/menu/{categoría}`)

Un botón "Agregar" en la tarjeta de cada plato, con los mismos estados y la misma regla que en el detalle: deshabilitado si el plato está agotado o si el carrito ya tiene todo su `stock`. Mismo `Notification` de confirmación.

- El botón **no navega**: hacer clic en él no abre el detalle, no inicia la *view transition* de HU-08 ni asigna ningún identificador de transición a esa tarjeta. Solo el clic en el resto de la tarjeta navega y anima.
- **El botón es un elemento compartido de la *view transition***, junto con la imagen, el nombre y el precio de HU-08: al abrir el detalle desde la tarjeta, el botón "Agregar" de esa tarjeta se anima hasta la posición y tamaño del botón "Agregar al carrito" del detalle (cambiando de texto y de tamaño con un cruce), y al volver se anima de regreso a la tarjeta. Mismas reglas de HU-08: solo la tarjeta clicada (o la de destino al volver) lleva los identificadores, nunca dos tarjetas a la vez; sin soporte de *view transitions* o con movimiento reducido, la navegación ocurre igual, sin animación; al abrir el detalle directamente, el botón aparece sin animación.
- Es un control propio, no un elemento dentro del enlace de la tarjeta (HTML inválido), y se alcanza con Tab y se activa con Enter o Espacio; su nombre accesible incluye el plato ("Agregar {nombre} al carrito").
- Agregar desde la tarjeta no cambia la página, el orden ni la posición de scroll del catálogo, de modo que volver desde el detalle (HU-08) sigue dejando la grilla como estaba.
- La única *view transition* sigue siendo tarjeta ↔ detalle; esta historia solo suma el botón a los elementos compartidos. Agregar un plato no dispara animación de navegación.
- **Estado inicial del detalle**: como el listado ahora trae `available` y `stock`, al llegar desde una tarjeta el detalle usa esos valores de inmediato, de modo que el botón conserva su estado (habilitado o deshabilitado) durante la animación y no parpadea; la respuesta del servidor lo confirma. Al abrir el detalle sin pasar por el catálogo, el botón está deshabilitado y el indicador sin estado hasta que llega la respuesta (HU-10).
- `stock` y la disponibilidad que trae el listado son **datos ocultos**: sirven solo para la lógica del botón y no se muestran en la tarjeta (sin indicador, sin "quedan N", sin números).

### Carrito (`/cart`)

Ruta única `/cart`, sin segmentos ni parámetros visibles. Dentro del `Layout` de la tienda (con header). Contenido:

- Título "Tu carrito" y botón secundario **"Compartir"**.
- Una fila por plato: imagen principal (o la de reemplazo del catálogo), nombre (enlace al detalle), precio unitario (`S/ 32.00`) y cantidad. Un plato agotado lleva la insignia "Agotado" de HU-10 y, en la fila, el aviso "Este plato está agotado. Quítalo o elige otro de la carta." para que el cliente decida; quitarlo es HU-13, por lo que en esta historia el aviso es informativo y la fila no ofrece aún el control para quitarlo.
- Si la cantidad guardada supera el `stock` actual, la fila muestra la cantidad ya ajustada al stock, sin aviso aparte: el número visible es la información.
- Carrito vacío: mensaje "Tu carrito está vacío" y enlace "Ver la carta" (`/menu`). "Compartir" no se muestra o está deshabilitado.

Cada fila enlaza al detalle del plato (imagen y nombre) con la misma *view transition* del catálogo: imagen, nombre y precio viajan de la fila al detalle y regresan al volver, y la posición de scroll del carrito se restaura. Solo la fila clicada lleva los identificadores de transición. El botón de agregar no está en la fila, así que el del detalle simplemente aparece.

La cantidad se muestra solo de lectura: modificar la cantidad y eliminar platos es HU-13, y subtotal, delivery y total son HU-14.

### Compartir

- Al hacer clic en "Compartir" se **copia automáticamente al portapapeles** un enlace de la forma `{origen}/cart?c={código}` y se muestra una `Notification` de éxito ("Copiamos el enlace de tu carrito").
- `{código}` codifica los ids y las cantidades en un texto compacto apto para URL: pares `id:cantidad` separados por coma (por ejemplo `12:2,7:1`) convertidos a base64 URL-safe, sin relleno `=`. El mismo carrito produce siempre el mismo código (ids ordenados de menor a mayor).
- Si el navegador no permite escribir en el portapapeles, el enlace se muestra en un campo de solo lectura, seleccionado, para copiarlo a mano.

### Abrir un enlace compartido

1. Al cargar `/cart?c={código}`, el código se decodifica y valida.
2. Los ítems válidos se incorporan al carrito local (regla de combinación en Decisiones).
3. El parámetro `c` se **elimina de la URL** (reemplazo del historial, no una entrada nueva), de modo que queda `/cart`. Recargar la página o volver atrás no vuelve a importar el carrito.
4. Se muestra una `Notification` informativa ("Cargamos el carrito que te compartieron").

## Criterios de aceptación

- **Dado** que estoy en el detalle de un plato disponible, **cuando** hago clic en "Agregar al carrito", **entonces** el plato queda en el carrito con cantidad 1 y veo la notificación de confirmación.
- **Dado** que veo la grilla del catálogo, **cuando** hago clic en "Agregar" de una tarjeta, **entonces** el plato queda en el carrito, veo la confirmación y **no** navego al detalle ni se dispara la animación.
- **Dado** que veo la grilla del catálogo, **cuando** hago clic en la tarjeta fuera del botón "Agregar", **entonces** navego al detalle con la *view transition* de siempre, y el botón de la tarjeta se anima hasta el botón "Agregar al carrito" del detalle junto con la imagen, el nombre y el precio.
- **Dado** que estoy en el detalle al que llegué desde el catálogo, **cuando** vuelvo, **entonces** el botón se anima de regreso hacia la tarjeta de ese plato junto con la imagen.
- **Dado** que el navegador no soporta *view transitions* o tengo activado el movimiento reducido, **cuando** navego entre catálogo y detalle, **entonces** la navegación ocurre sin animación y sin error, y los botones funcionan igual.
- **Dado** que una tarjeta mostraba el botón habilitado, **cuando** abro su detalle desde ella, **entonces** el botón del detalle aparece habilitado desde el primer cuadro (no pasa por deshabilitado).
- **Dado** el catálogo, **cuando** lo miro, **entonces** no veo stock ni disponibilidad en las tarjetas; solo el botón habilitado o deshabilitado.
- **Dado** que agregué un plato desde la tarjeta, **cuando** abro su detalle y vuelvo, **entonces** la grilla está en la misma categoría, página, orden y posición, y la imagen vuelve animada a su tarjeta.
- **Dado** que ya tengo el plato en el carrito, **cuando** lo agrego otra vez, **entonces** su cantidad aumenta en 1 y no aparece una segunda fila.
- **Dado** un plato agotado (`available = false` o `stock = 0`) o con disponibilidad aún no confirmada, **cuando** veo su detalle o su tarjeta, **entonces** el botón de agregar está deshabilitado.
- **Dado** que mi carrito tiene un plato agotado, **cuando** abro `/cart`, **entonces** su fila lleva la insignia "Agotado" y el aviso "Este plato está agotado. Quítalo o elige otro de la carta."
- **Dado** un plato con `stock = 3`, **cuando** lo agrego tres veces, **entonces** la cantidad llega a 3 y el botón queda deshabilitado en el detalle y en la tarjeta.
- **Dado** un plato con `stock = 0` y `available = true`, **cuando** abro su detalle, **entonces** el indicador dice "Agotado".
- **Dado** cualquier pantalla de la tienda, **cuando** miro el header, **entonces** veo el ícono de carrito a la izquierda de "Iniciar sesión" (o del menú del usuario).
- **Dado** que el carrito tiene platos, **cuando** miro el ícono, **entonces** veo, en un círculo en la esquina superior derecha del ícono, la cantidad de productos distintos; **y** si está vacío, no veo la insignia.
- **Dado** que tengo 3 unidades de un mismo plato en el carrito, **cuando** miro el ícono, **entonces** la insignia muestra 1 (agregar otra unidad del mismo plato no la cambia, agregar un plato distinto sí).
- **Dado** que estoy en `/cart`, **cuando** hago clic en la imagen o el nombre de un plato, **entonces** navego a su detalle con la imagen, el nombre y el precio animados desde la fila; **y cuando** vuelvo (botón "Volver" o atrás del navegador), **entonces** regreso a `/cart` con la animación inversa y en la misma posición de scroll.
- **Dado** que abro el detalle de un plato desde cualquier pantalla de la app sin que esta indique su origen, **cuando** hago clic en "Volver", **entonces** vuelvo a la pantalla anterior del historial; si abrí el detalle directamente, voy a la categoría del plato.
- **Dado** que hago clic en el ícono del carrito, **cuando** navega, **entonces** llego a `/cart` y veo los platos del carrito con imagen, nombre, precio y cantidad.
- **Dado** que el carrito está vacío, **cuando** abro `/cart`, **entonces** veo "Tu carrito está vacío" y el enlace a la carta.
- **Dado** que estoy en `/cart` con platos, **cuando** hago clic en "Compartir", **entonces** se copia al portapapeles un enlace `/cart?c={código}` que codifica los ids y las cantidades, y veo la confirmación.
- **Dado** un enlace compartido, **cuando** lo abro (con o sin sesión, en otro navegador o dispositivo), **entonces** veo en `/cart` los mismos platos con las mismas cantidades.
- **Dado** que abrí un enlace compartido, **cuando** termina de cargar, **entonces** la URL es `/cart` sin parámetros, y recargar no vuelve a aplicar el código.
- **Dado** que agregué platos, **cuando** recargo o cierro y vuelvo a abrir la tienda en el mismo navegador, **entonces** el carrito conserva sus platos y cantidades.
- **Dado** que no he iniciado sesión, **cuando** agrego platos o abro `/cart`, **entonces** funciona igual.

## Casos borde

- **Código inválido** (base64 roto, formato distinto, cantidades no numéricas, `c` vacío): se ignora completo, el carrito local no cambia, se limpia la URL y se muestra "No pudimos leer el carrito compartido".
- **Ítems individuales inválidos** (cantidad menor que 1, id repetido, id no numérico): se descartan solo esos ítems; los válidos se cargan. Si un id repetido aparece más de una vez, vale la primera aparición.
- **Plato inexistente o inactivo** en un enlace o en el carrito local: no se muestra y se quita del carrito, sin aviso aparte. El servidor decide, no el enlace.
- **Plato agotado**: se mantiene en el carrito y se marca "Agotado". Bloquearlo al pagar es del checkout (ver Fuera de alcance).
- **Cantidad máxima = stock**: al agregar, al importar un enlace y al mostrar `/cart`, la cantidad se recorta al `stock` actual del plato. El servidor decide: un enlace con 50 de un plato con stock 4 queda en 4.
- **Stock cambió después de agregar**: si bajó, `/cart` ajusta la cantidad (ver Pantallas); si pasó a 0, el plato se muestra "Agotado" y se mantiene en el carrito. La insignia del header cuenta los platos guardados en el carrito, no sus cantidades.
- **Carrera por el último ítem**: la verificación final del stock es del checkout; el carrito no reserva stock.
- **Carrito grande**: el enlace no debe exceder unos 2 000 caracteres; con la carta actual no es alcanzable, pero si ocurre se avisa en vez de copiar un enlace truncado.
- **`localStorage` no disponible** (modo privado, bloqueado): el carrito funciona en memoria durante la sesión de la pestaña y no falla. Es una conveniencia, no una garantía.
- **Contenido corrupto en `localStorage`** (JSON roto, ítems con forma incorrecta): se ignora y se parte de un carrito vacío; no hay pantalla de error.
- **Varias pestañas**: el carrito se sincroniza entre pestañas del mismo navegador con el evento `storage` (Zustand `persist` no lo hace solo; se resuelve en el plan).
- **Carga de datos en `/cart`**: mientras llegan nombres, precios e imágenes, la pantalla muestra un estado de carga; la insignia del header no depende de esto, solo de los ids guardados.
- **Error de red al cargar `/cart`**: mensaje de error con "Reintentar"; el carrito local no se pierde.
- **Seguridad**: el código solo contiene ids y cantidades enteras; nunca precios, notas ni datos personales. Todo valor del enlace se valida como entrada no confiable.

## Fuera de alcance

- Modificar la cantidad y eliminar platos desde `/cart` (HU-13).
- Subtotal, costo de delivery y total (HU-14).
- Nota por plato (HU-15). El `CartItem` provisional tenía `nota`; no se conserva en esta historia.
- Garantías extra de persistencia del carrito y su conservación al iniciar sesión o registrarse (HU-16, HU-35). Esta historia usa `localStorage` por necesidad técnica; HU-16 verifica ese comportamiento y cubre los casos que queden.
- Guardar el carrito en el servidor o asociarlo a una cuenta.
- Validar disponibilidad y precios al confirmar el pedido (checkout, HU-17 en adelante).
- Descontar el stock al confirmar un pedido, reservarlo mientras está en el carrito y editarlo desde `/admin` (HU-29/HU-30, checkout).
- Mostrar "quedan N unidades" al cliente (HU-10 ya lo dejó fuera).
- Acortador de enlaces o enlaces con vencimiento.
- Layout para celular, igual que HU-07 y HU-08.

## Impacto en documentación

- `AGENTS.md`: la línea "Estado global" pasa de "Context API + hooks (`AuthContext`, `CartContext`)" a Context API para auth y **Zustand** para el carrito; sumar `zustand` al stack del frontend.
- `docs/diagrama-de-base-de-datos.md`: documentar `products.stock` y su regla con `is_available` (y la imagen `database-diagram.png`, si el diagrama la refleja).
- `specs/hu-08-ver-detalle-plato/spec.md`: el botón de agregar pasa a ser un elemento compartido de la *view transition*.
- `specs/hu-10-disponibilidad-plato/spec.md`: el indicador pasa a depender también de `stock`, y el listado deja de omitir la disponibilidad.
- `docs/diagrama-de-arquitectura.md`: indica que el armado y la persistencia del carrito sin cuenta están en la capa de Servicios del backend. Con esta historia el carrito vive en el cliente; actualizar la descripción en el mismo cambio.

## Decisiones de clarificación

- **Combinar al importar un enlace**: se une al carrito local; para un plato en ambos vale la cantidad del enlace (recortada al stock) y los demás platos locales se conservan.
- **Botón de agregar**: va en el detalle y en las tarjetas del catálogo, y es un elemento compartido de la *view transition* de HU-08 (junto con imagen, nombre y precio). El clic en el botón de la tarjeta agrega y no navega.
- **Stock y disponibilidad en el listado**: viajan en la respuesta pero no se muestran en las tarjetas; solo habilitan o deshabilitan el botón.
- **`available` y `stock`**: se conservan ambos (`available` es el interruptor manual del administrador; `stock`, la cantidad).
- **Semilla de `stock`**: entre 5 y 30 por plato, y `0` en los platos ya marcados como agotados en `R__sample_products.sql`.
- **Límite de cantidad**: el `stock` del plato (se descartó el límite fijo de 20). Se agrega `stock` a la entidad producto.
- **Datos de `/cart`**: un endpoint de lectura que acepte varios ids (`GET /api/products?ids=12,7`); el detalle va en `plan.md`.

## Preguntas abiertas

Ninguna.
