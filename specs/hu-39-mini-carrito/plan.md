# Plan: HU-39 — Ver y ajustar el carrito desde el ícono del navegador superior

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios. El carrito vive en el cliente (HU-12) y `GET /api/products?ids=` ya entrega nombre, imagen, precio, `available` y `stock`, que es todo lo que la tarjeta necesita.

## Frontend

Todo en `frontend/src/features/carrito/` salvo el montaje, que ocurre dentro de `CartLink` (ya usado por `components/header.tsx`).

### Store (`cart-store.ts`)

- `emptyCart()`: vacía `items` y fija `lastCleared: { at }` (y pone `lastAdded` y `lastRemoved` en `null`).
- `lastCleared` es transitorio, igual que `lastAdded` y `lastRemoved`: no entra en `partialize`, y los demás eventos lo ponen en `null` para que solo haya un aviso a la vez.
- `clear()` se mantiene **silencioso**: `order-result-page.tsx` lo usa al confirmar un pedido y no debe mostrar "Vaciamos tu carrito".

### Datos de la tarjeta (`use-cart-details.ts`)

Hoy `CartPage` calcula en línea los ids ordenados, llama a `useCartProducts`, corre `reconcile` al terminar de cargar y arma `productsById` y el resumen. Esa lógica se extrae a un hook `useCartDetails()` que devuelve `{ items, query, productsById, summary }` y la usan `CartPage` y la tarjeta. Así:

- La tarjeta comparte la misma `queryKey` que `/cart` (cache de `react-query`) y aplica el mismo `reconcile`: un plato inexistente o inactivo se quita sin aviso, y una cantidad por encima del stock se ajusta (spec, casos borde).
- El total sale de `computeOrderSummary` (los platos agotados no suman y devuelve `null` mientras falte algún precio), de modo que el total de la tarjeta y el subtotal de `/cart` nunca difieren.
- El hook solo se monta **mientras la tarjeta está abierta**, para no pedir platos al servidor en cada página con carrito. Al abrirse, `useCartProducts` (`staleTime: 0`, `refetchOnMount: 'always'`) trae stock y precios vigentes, mostrando antes los datos en cache si los hay (`keepPreviousData`).

### Tarjeta (`components/cart-popover.tsx`)

Contenido de la tarjeta, sin lógica de apertura. Usa `Card` y llama a `useCartDetails()`:

- **Lista** (`<ul>` con altura máxima, `max-h-80 overflow-y-auto`): una `CartPopoverRow` por plato. El total y los botones quedan fuera de la lista, así siempre visibles.
- **Fila** (`components/cart-popover-row.tsx`):
  - `DishImage` de 48 px (`h-12 w-12 rounded-md object-cover`), que ya cubre la imagen de reemplazo.
  - Nombre con `truncate` en una línea (`text-sm font-bold`, `min-w-0` en el contenedor flex para que el recorte funcione) y `title` con el nombre completo. El nombre no es un enlace: la tarjeta no navega a los detalles.
  - Plato agotado (`!product.available`): una línea bajo el nombre, `text-xs text-error-text`, "Agotado, no suma al total" (sin `AvailabilityBadge`, que ocuparía una segunda línea y es demasiado grande para la fila compacta). Es una sola línea (`truncate`) para no crecer la fila.
  - Cantidad con botones **−** y **+** (`Button variant="secondary"` compacto, `h-8 w-8`, con `aria-label` "Quitar una unidad de {nombre}" / "Agregar una unidad de {nombre}") y el número entre ambos (`aria-live="polite"`, `aria-label` "Cantidad de {nombre}"). No hay campo: escribir la cantidad queda en `/cart` (spec, fuera de alcance). `QuantityStepper` no se reutiliza porque trae el campo editable y un tamaño de 40 px; la regla sí se reutiliza: `max = quantityCap(purchasable, quantity)`, **+** deshabilitado en el máximo y **−** con 1 llama a `remove`.
  - Botón de eliminar: `IconButton variant="secondary"` con `TrashIcon` y `aria-label` "Eliminar {nombre} del carrito".
  - Mientras el producto aún no llegó (`query.isPending`) la fila es un esqueleto (`animate-pulse`), igual que en `/cart`; sin producto y sin carga pendiente no se dibuja (el `reconcile` ya lo quitó).
  - Sin animación de salida: al quitar, la fila desaparece al instante (la animación de `/cart` es solo allí).
- **Pie**: "Total" con `formatPrice(summary.total)`; si `summary === null` un esqueleto en su lugar. Debajo, "Vaciar carrito" (`Button variant="secondary"`, llama a `emptyCart()`) y "Ver carrito": un `Link` a `/cart` con las clases de `Button` primario (ver Decisiones).
- **Vacía**: con `items.length === 0` solo "Tu carrito está vacío.", sin total ni botones. Como la tarjeta no se cierra sola, quitar el último plato la deja en ese estado en lugar de cerrarse.
- **Error de carga**: `query.isError` muestra "No pudimos cargar tu carrito." con "Reintentar", como `/cart`; "Vaciar carrito" se mantiene disponible.

### Apertura y cierre (`components/cart-link.tsx`)

`CartLink` pasa a envolver el ícono y la tarjeta en un contenedor `relative`:

- **Rutas sin tarjeta**: `useLocation()`; si `pathname === '/cart'` o empieza por `/checkout`, se renderiza solo el `Link` actual (sin contenedor ni listeners).
- Estado `open`. Se abre con `onMouseEnter` y `onFocus` del contenedor; se cierra con `onMouseLeave` tras un retardo de 150 ms (cancelable si el cursor vuelve a entrar) y con `onBlur` cuando `relatedTarget` queda fuera del contenedor (el retardo no aplica al foco).
- **Sin hueco entre ícono y tarjeta**: la tarjeta se posiciona con `absolute right-0 top-full` dentro del mismo contenedor y con un `pt-2` transparente sobre ella, de modo que el cursor pasa del ícono a la tarjeta sin salir del contenedor (más el retardo como red de seguridad).
- **Teclado**: un `keydown` en el contenedor cierra con **Escape** y devuelve el foco al enlace del ícono, igual que el menú de usuario del header (`header.tsx`).
- La tarjeta se cierra también al cambiar de ruta (`useEffect` sobre `pathname`), por si se llega a `/cart` con "Ver carrito".
- **Accesibilidad**: la tarjeta es un `role="region"` con `aria-label="Resumen del carrito"`, no un `dialog` (no atrapa el foco). El enlace del ícono conserva su `aria-label` y recibe `aria-expanded`. No se usa `aria-haspopup`: el enlace navega a `/cart`.
- **Táctil**: sin tratamiento (fuera de alcance). Los eventos `mouseenter` no se disparan con un toque, por lo que el ícono sigue yendo a `/cart`. El `onFocus` abre la tarjeta tras un toque en algunos navegadores; para no cambiar el comportamiento táctil se abre solo con `:focus-visible` (`event.target.matches(':focus-visible')`), que en un toque no se cumple.
- Posición: `right-0` con `z-20` y ancho fijo `w-96` (`max-w-[calc(100vw-3rem)]` para que no se salga en ventanas angostas).

### Aviso al vaciar (`components/cart-notice.tsx`)

`CartNotice` suma `lastCleared`: si es el evento más reciente muestra `Notification` `success` "Vaciamos tu carrito", sin acción, con la misma duración y cierre manual. Sigue habiendo un único aviso a la vez.

### Componentes del design system

`Card`, `Button`, `IconButton` y `Notification` (`success`) tal cual. El tamaño compacto de los botones **−**/**+** (32 px) se pide por `className` sobre `Button`, igual que hace `IconButton` (`h-10 w-10 px-0!`); no se agregan colores ni espaciados nuevos. No hay componente de tarjeta emergente en `design-system/components/`; se arma con `Card` y las utilities de Tailwind.

## Seguridad

- Las cantidades pasan por el mismo store que `/cart`: el tope por stock se valida en `setQuantity`/`add`, no solo en el botón, de modo que ningún camino deja una cantidad menor que 1 o mayor que el stock en una fila.
- El stock del cliente sigue siendo solo una ayuda; la verificación real es del checkout (HU-12).
- `emptyCart` solo toca el estado local; no hay llamadas al backend.

## Decisiones

- **Hook `useCartDetails` compartido**: evita duplicar el `reconcile` y el cálculo del subtotal, y garantiza que la tarjeta y `/cart` coincidan. Es un refactor de `CartPage` sin cambio de comportamiento, cubierto por `cart-page.test.tsx` existente.
- **Datos solo con la tarjeta abierta**: el contenido se monta al abrir; un `CartLink` cerrado no hace peticiones.
- **Un `emptyCart` aparte de `clear`**: `clear` lo usa el flujo de pedido confirmado y no debe notificar.
- **Botones solo −/+, sin campo**: lo pide la spec; la tarjeta es para ajustes rápidos y `/cart` sigue siendo el lugar de edición completa.
- **"Ver carrito" como `Link` con estilo de botón**: `Button` no admite renderizar un enlace; se reutilizan sus clases en un `Link` para conservar la semántica de enlace (abrir en pestaña nueva, etc.).
- **Retardo de cierre de 150 ms**: evita que la tarjeta parpadee si el cursor roza el borde al ir del ícono a la tarjeta.
- **Sin cambios de backend ni de modelo de datos.**

## Impacto en docs/

- `docs/epicas.md`, `docs/historias.md` y `docs/diagrama-de-casos-de-uso.md`: ya actualizados al crear la historia.
- `docs/cronograma.md`: agregar HU-39 al sprint donde se planifique (hoy no está asignada).
- `frontend/src/features/carrito/README.md`: documentar `CartPopover`, `useCartDetails` y `emptyCart`.
- Sin cambios en arquitectura, despliegue ni modelo de datos.
