# Plan: HU-13 — Modificar la cantidad o eliminar platos del carrito

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios. El carrito vive en el cliente (HU-12) y `GET /api/products?ids=` ya entrega `available` y `stock`, que es todo lo que necesita el límite de cantidad.

## Frontend

Todo en `frontend/src/features/carrito/` salvo el montaje en `Layout` y la integración en el detalle.

### Store (`cart-store.ts`)

- `add(product, quantity = 1)`: hoy suma 1. Pasa a recibir la cantidad y suma `quantity` al plato (o crea la fila), recortando a `cap` (ver abajo). Sigue fijando `lastAdded` para el aviso "Agregamos {nombre} a tu carrito"; las tarjetas llaman `add(product)` sin cambios.
- `setQuantity(product, quantity)`: fija la cantidad exacta de un plato que ya está en el carrito.
  - `quantity <= 0` equivale a `remove`.
  - `quantity > cap` se recorta a `cap`.
  - No toca `lastAdded` (los cambios de cantidad que no eliminan no notifican).
  - Si el plato no está en el carrito, no hace nada (agregar es `add`).
- `remove(productId, name)`: quita la fila y fija `lastRemoved: { productId, name, at }`. Es el único camino que fija `lastRemoved`, así que `reconcile` (platos inexistentes o inactivos) sigue quitando sin aviso.
- `cap`: `min(stock, MAX_QUANTITY)` para un plato pedible (`available = true`). Un plato **no pedible** (agotado o `available = false`) tiene `cap` igual a su cantidad actual: no puede crecer, pero sí bajar o quitarse. `MAX_QUANTITY` (99, de `share-code.ts`) ya es el tope de lo que `parseItems` acepta al leer `localStorage`; usarlo evita guardar algo que luego se descarte.
- `lastRemoved` es transitorio, igual que `lastAdded`: no entra en `partialize`.

### Control de cantidad (`components/quantity-stepper.tsx`)

Componente controlado y sin conocimiento del carrito: `value`, `min` (0 en el carrito, 1 antes de agregar), `max`, `label` (nombre del plato), `disabled`, `onChange(n)`.

- Fila con botón **−**, campo y botón **+**. Los botones usan `Button` (variante `secondary`, con `aria-label` "Quitar una unidad de {nombre}" / "Agregar una unidad de {nombre}"). El campo es un `<input>` propio con las mismas clases de tokens que `Input` (`Input` impone una etiqueta visible y un ancho máximo que no encajan en el stepper); `aria-label` con el plato, `inputMode="numeric"` y `type="text"` para no heredar las flechas ni el `e`/`-` de `type="number"`.
- Estado local `draft` (texto) mientras se escribe: `onChange` del campo elimina todo lo que no sea dígito y `onChange(n)` del componente solo se llama al confirmar (Enter o `blur`).
- Confirmar: `''` → vuelve a `value`; número → `parseInt(draft, 10)` (ceros a la izquierda y números enormes caen en el recorte; un número que no es seguro como entero se trata como `max`); luego `clamp(n, min..max)`. Con `min = 0`, `0` llega como `0` y quien lo usa lo trata como quitar; con `min = 1`, `0` se recorta a 1 (el campo muestra 1, "vuelve al valor anterior" si el anterior era 1; ver Decisiones).
- **+** deshabilitado si `value >= max`; **−** deshabilitado si `value <= min`. Con `disabled`, los tres elementos quedan deshabilitados.
- Enter se maneja con `onKeyDown` y `preventDefault` para no enviar formularios ni navegar.
- Cuando `value` cambia desde fuera (otra pestaña, otro control), el `draft` se resincroniza.

### Detalle del plato

- Nuevo `components/product-purchase.tsx`, que reemplaza el bloque `AddToCartButton` + texto de límite de `ProductDetailPage`. Lee la cantidad en el carrito con `useAddToCart`:
  - **Fuera del carrito**: estado local `pending` (parte en 1). Fila con `QuantityStepper` (`min = 1`, `max = cap`, deshabilitado si el plato no se puede pedir o la disponibilidad no está confirmada) y `AddToCartButton` con la nueva prop `quantity={pending}`. Al agregar, el plato entra con `pending` unidades y el componente pasa solo al modo "en el carrito".
  - **En el carrito**: solo el `QuantityStepper` (`min = 0`) atado a `setQuantity`; si llega a 0 se llama `remove`. Al quitarse el plato `pending` se reinicia en 1 y reaparece el botón.
  - El texto "Ya tienes todo el stock disponible en tu carrito" se conserva y solo aplica en modo "en el carrito".
- `useAddToCart` expone además `quantity` y `cap`; `add` acepta la cantidad.
- `AddToCartButton` recibe `quantity?: number` (por omisión 1) y la pasa a `add`.
- La *view transition* del control: `transition-names.ts` suma `stepper`; el `QuantityStepper` acepta `style` y lo recibe `sharedName('stepper', transitioning)` tanto en `CartItemRow` como en `ProductPurchase`, de modo que la fila clicada y el detalle comparten el elemento. Es una sola instancia del control en el detalle, por lo que el nombre existe en ambos estados (fuera y dentro del carrito).
- La *view transition*: el nombre `cta` sigue en el `AddToCartButton`. Con el plato en el carrito el botón no existe y el nombre no tiene destino: el navegador cruza el resto sin animar ese elemento, sin código adicional. El `pending` no afecta el estado inicial del detalle (parte en 1), así que no hay parpadeo.

### Carrito (`/cart`)

- `CartItemRow` reemplaza "Cantidad: N" por `QuantityStepper` (`min = 0`) y un botón `Button variant="secondary"` "Eliminar" con `aria-label` "Eliminar {nombre} del carrito". Ambos llaman a las acciones del store con `product` (que trae `available` y `stock`) y la cantidad ya ajustada que recibe la fila.
- La fila mantiene el aviso de plato agotado; el stepper queda con **+** deshabilitado por `cap`.
- Mientras `query.isPending` no hay `product`, así que la fila muestra el esqueleto de HU-12 y no hay control hasta conocer el stock.
- Foco: al quitar un plato la fila desaparece y el foco se perdería. `CartPage` pasa a las filas un `onRemoved` que enfoca el `h1` "Tu carrito" (`tabIndex={-1}`, como ya hace el detalle con su título).
- El estado vacío y "Compartir" ya reaccionan a `items.length`, sin cambios.

### Aviso al eliminar

- `CartAddedNotice` se renombra a `CartNotice` (`components/cart-notice.tsx`) y muestra el evento más reciente entre `lastAdded` y `lastRemoved`, para que nunca haya dos avisos apilados en la misma esquina.
  - Agregado: igual que hoy ("Agregamos {nombre} a tu carrito", con "Ver carrito").
  - Quitado: `Notification` `success` "Quitamos {nombre} de tu carrito", sin acción.
- Misma duración (4 s) y cierre manual. Se monta en `Layout` como hoy.

### Componentes del design system

`Button` (primary/secondary) y `Notification` (`success`) tal cual. El campo del stepper reutiliza los tokens de `Input` (borde, radio, foco); no se agregan colores ni espaciados.

## Seguridad

- La cantidad es entrada no confiable: solo dígitos, se recorta al `cap` y se valida en el store (no solo en el componente), de modo que ningún camino deja un valor menor que 1 o mayor que el stock en una fila.
- El stock del cliente es solo una ayuda: la verificación real sigue siendo del checkout (HU-12, Fuera de alcance).
- El `localStorage` sigue pasando por `parseItems` al hidratar, por lo que lo editado a mano en el navegador se normaliza.

## Decisiones

- **Una sola acción de quitar**: `setQuantity(…, 0)` delega en `remove`, de modo que "Eliminar", **−** hasta 0 y escribir `0` comparten el aviso y el foco sin duplicar lógica.
- **Valor de `min` según el contexto**: antes de agregar no hay nada que eliminar, por lo que el stepper del detalle no llega a 0 (spec). Escribir `0` ahí deja el campo en 1.
- **Plato no pedible**: `cap` igual a la cantidad actual en vez de 0, para que escribir un número menor lo baje sin quitarlo por accidente y para que **+** quede deshabilitado.
- **`type="text"` con `inputMode="numeric"`** en lugar de `type="number"`: evita aceptar `e`, `-` o `.` y el cambio de valor con la rueda del mouse.
- **Confirmar al salir del campo y con Enter**, no en cada pulsación, para que borrar el campo para escribir otro número no quite el plato.
- **Sin cambios de backend ni de modelo de datos.**

## Impacto en docs/

- `specs/hu-08-ver-detalle-plato/spec.md`: el espacio del botón de agregar muestra stepper + botón (o solo el stepper si el plato ya está en el carrito).
- `frontend/src/features/carrito/README.md`: mencionar `QuantityStepper`, `ProductPurchase` y las acciones `setQuantity` / `remove`.
- `docs/` (arquitectura, base de datos): sin cambios.
