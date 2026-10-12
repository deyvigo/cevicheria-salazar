# Plan: HU-12 — Agregar platos al carrito

`spec.md` en estado Clarificada.

## Backend

El carrito no tiene tablas ni endpoints de escritura: vive en el navegador. El backend solo agrega el stock al plato y una lectura por varios ids.

### Base de datos

Migración `V5__product_stock.sql`:

```sql
ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0);
UPDATE products SET stock = 20;
```

- `NOT NULL DEFAULT 0` con `CHECK (stock >= 0)`: un `INSERT` que no la mencione (HU-29 más adelante) nace agotado en lugar de con un stock inventado, y la base impide valores negativos aunque falle una validación.
- El `UPDATE` deja los platos que ya existen en 20 para que la carta de producción no quede agotada al migrar. Es una sola vez (la migración no se repite).
- Sin índice: no se filtra ni se ordena por stock.
- Actualizar `docs/diagrama-de-base-de-datos.md` (tabla `products`): `stock` y su regla con `is_available`.

### Capas (paquete `com.salazar.api.catalogo`)

- **`Product`**: campo `stock` (`int`, `@Column(nullable = false)`) con getter. El constructor recibe `stock` explícito (se actualizan los llamadores en tests y semilla; no hay un valor por defecto escondido). Método `isOrderable()`: `available && stock > 0`, la única fuente de la regla "se puede pedir".
- **`dto/ProductResponse`** (listado y lectura por ids): agrega `available` (`boolean`) y `stock` (`int`).
- **`dto/ProductDetailResponse`**: agrega `stock`.
- En ambas respuestas, `available` es `product.isOrderable()`, es decir, ya combina el interruptor del administrador con `stock > 0`. El frontend nunca recalcula esa regla; `stock` solo sirve para limitar cantidades.
- **`ProductRepository`**: `List<Product> findAllByIdInAndActiveTrueOrderByIdAsc(Collection<Long> ids)`. Las imágenes ya se cargan con `@BatchSize`.
- **`CatalogService.getProductsByIds(List<Long> ids)`**: deduplica y consulta. Los ids inexistentes o inactivos simplemente no vienen en la respuesta (el cliente interpreta la ausencia). Más de 100 ids → `400` con el manejador existente (`ApiExceptionHandler`, mismo caso que un parámetro inválido).
- **`CatalogController`**: `@GetMapping(value = "/products", params = "ids")` que devuelve `List<ProductResponse>` (sin paginar, ordenada por id) con `ids=12,7`. Un id no numérico produce `MethodArgumentTypeMismatchException` → `400` ya existente. El mapeo sin `ids` queda intacto. Es público, igual que el resto del catálogo.

### Datos de ejemplo

`R__sample_products.sql`: `INSERT` de platos agrega la columna `stock`; al final:

```sql
UPDATE products SET stock = 5 + (id * 7) % 26;
UPDATE products SET stock = 0 WHERE name IN ('Ceviche de erizo', 'Chicharrón de pota', 'Chicha morada');
```

El primer `UPDATE` es determinista por id (entre 5 y 30) y el segundo agota los 3 platos que HU-10 ya marcaba con `is_available = false`, de modo que ambas causas de "Agotado" (`available = false` y `stock = 0`) se pueden ver en local: se agrega un cuarto plato con `is_available = true` y `stock = 0` para cubrir la regla combinada.

## Frontend

Dependencia nueva: `zustand` (con `pnpm add zustand`). Se elimina `src/context/cart-context.tsx` y su `CartProvider` de `main.tsx`.

### Archivos (`src/features/carrito/`)

- **`cart-store.ts`**: store de Zustand con `persist`.
  - Estado: `items: { productId: number; quantity: number }[]` y `lastAdded: { productId: number; name: string; at: number } | null` (efímero, no se persiste).
  - `persist` con `name: 'salazar.carrito'`, `version: 1`, `partialize` solo `items`, y `storage` de `createJSONStorage` sobre un envoltorio que envuelve `getItem`/`setItem`/`removeItem` en `try/catch` (modo privado, cuota llena, acceso bloqueado: el carrito sigue en memoria).
  - `merge` valida lo persistido con un esquema `zod`: cualquier cosa inválida (incluido el arreglo del antiguo `CartContext`, que usaba la misma llave) se descarta y se parte de un carrito vacío.
  - Acciones: `add(product)` (suma 1 sin pasar de `product.stock`, ignora un plato no pedible, escribe `lastAdded`); `importItems(items)` (regla de unión: el plato en ambos toma la cantidad del enlace, los demás locales se conservan); `reconcile(products, requestedIds)` (ver abajo); `clear()`.
  - Un listener `storage` de `window` (registrado una vez en el módulo) llama `useCartStore.persist.rehydrate()` cuando cambia la llave `salazar.carrito`, para sincronizar pestañas.
  - Selectores: `selectProductCount = (s) => s.items.length` (insignia) y `selectQuantityOf(id)`.
- **`share-code.ts`**: `encodeCart(items)` y `decodeCart(code)`.
  - Codifica los pares `id:cantidad` ordenados por id y unidos por coma en base64 URL-safe sin relleno (`btoa` es suficiente: es ASCII).
  - `decodeCart` devuelve `{ items, ok }` y aplica las reglas de validación de la spec: formato estricto con expresión regular, enteros positivos seguros, cantidad mínima 1, tope técnico de 99 por ítem y de 100 platos distintos, ids repetidos (vale el primero). Si el texto base64 o el formato no se pueden leer, `ok = false`.
  - `buildShareUrl(items)`: `${location.origin}/cart?c=${code}`; devuelve `null` si pasa de 2 000 caracteres.
- **`cart-api.ts`**: `getProductsByIds(ids)` → `GET /products?ids=…` con el tipo `Product` de `catalogo` (ya trae `available` y `stock`).
- **`use-cart-products.ts`**: `useCartProducts(ids)` con `useQuery`, llave `['catalog', 'cart-products', ids.join(',')]`, `enabled` si hay ids, `staleTime: 0` y `refetchOnMount: 'always'` para que el stock de `/cart` sea el vigente.
- **`cart-page.tsx`** (`/cart`):
  1. Al montar, lee `c` de `useSearchParams`; si existe, decodifica, llama `importItems`, y con `setSearchParams({}, { replace: true })` deja la URL en `/cart`. Una referencia (`useRef`) evita la doble ejecución de StrictMode. Éxito → `Notification` "Cargamos el carrito que te compartieron"; formato ilegible → `Notification` de error "No pudimos leer el carrito compartido", sin tocar el carrito.
  2. Pide los platos con `useCartProducts`. Al llegar la respuesta llama `reconcile`: quita los ids que no vinieron (inexistentes o inactivos), y a los que vinieron con `stock > 0` les recorta la cantidad a `stock`; con `stock = 0` conserva el ítem y la cantidad (se muestra "Agotado").
  3. Estados: cargando (esqueleto), error de red (mensaje con "Reintentar", sin tocar el carrito), vacío ("Tu carrito está vacío" + enlace a `/menu`) y lista.
  4. Quitar platos que ya no existen y ajustar cantidades al stock no tienen aviso aparte: el cliente ya ve el resultado en la propia lista.
- **`components/cart-item-row.tsx`**: imagen (`DishImage`), nombre como `Link` a `/products/{id}`, precio con `formatPrice`, cantidad de solo lectura y, cuando `available = false`, `AvailabilityBadge` más el texto "Este plato está agotado. Quítalo o elige otro de la carta." (`text-error-text`).
- **`components/share-button.tsx`**: `Button` secundario "Compartir". Llama `navigator.clipboard.writeText(url)` dentro de `try/catch`; éxito → `Notification` "Copiamos el enlace de tu carrito"; si no hay `navigator.clipboard` o rechaza, muestra un `Input` de solo lectura con el enlace y lo selecciona (`select()`). Si `buildShareUrl` devuelve `null`, muestra un error en vez de un enlace truncado.
- **`components/cart-link.tsx`**: enlace a `/cart` con el ícono (SVG inline, `aria-hidden`) y la insignia. La insignia es un `span` `absolute -top-1 -right-1` de `h-5 min-w-5 rounded-full bg-action text-on-action text-xs font-bold`, con "99+" desde 100; no se renderiza con 0. El nombre accesible es `Carrito` o `Carrito, N producto(s)` (`aria-label` en el enlace), así que el número no depende del color.
- **`components/add-to-cart-button.tsx`**: recibe `{ product: { id, name, available, stock } | null, label, className, style }`. Calcula `canAdd = available === true && quantityInCart < stock` con el selector; `product.available === null` (detalle sin datos del servidor) deja el botón deshabilitado. Al hacer clic llama `add` y no hace nada más. `aria-label` = `Agregar {name} al carrito` para distinguir los botones de la grilla. Expone `atLimit` (para el texto de apoyo del detalle) con un hook hermano `useAddToCart(product)`.
- **`components/cart-added-notice.tsx`**: lee `lastAdded` del store; muestra un `Notification` de éxito ("Agregamos {nombre} a tu carrito") con enlace "Ver carrito" y se cierra a los 4 s (mismo patrón que `LogoutNotice`). Se monta en `Layout`.

### Cambios en archivos existentes

- **`components/notification.tsx`**: prop opcional `action?: ReactNode` que se pinta bajo el mensaje, para el enlace "Ver carrito". Sin cambios visuales si no se pasa. Actualizar `design-system` solo si el componente de referencia lo exigiera (no lo hace: es un enlace de texto).
- **`components/header.tsx`**: la columna derecha pasa a un `div` flex (`items-center gap-3 justify-self-end`) con `CartLink` a la izquierda de "Iniciar sesión" o del menú del usuario. `CartLink` se muestra también mientras `isLoading`.
- **`components/layout.tsx`**: monta `CartAddedNotice` junto a `LogoutNotice`.
- **`router.tsx`**: ruta `/cart` dentro de `Layout`.
- **`features/catalogo/catalog-api.ts`**: `Product` agrega `available: boolean` y `stock: number`; `ProductDetail` agrega `stock: number | null` (y conserva `available: boolean | null`).
- **`features/catalogo/use-catalog-queries.ts`**: el `placeholderData` de `useProduct` pasa `available: found.available` y `stock: found.stock` (antes `available: null`). Así el botón y el indicador conservan su estado durante la *view transition*; sin datos de la lista (carga directa) siguen en `null`.
- **`features/catalogo/transition-names.ts`**: agrega `cta: 'product-cta'`.
- **`features/catalogo/components/product-card.tsx`**: el botón no puede ir dentro del `Link` (HTML inválido), así que la tarjeta pasa a un contenedor `relative` con el `Link` de siempre (misma `Card`, mismos nombres de transición) y, hermano del `Link`, el `AddToCartButton` posicionado de forma absoluta sobre el hueco que la `Card` reserva abajo (un bloque `h-12` `aria-hidden` dentro del `Link`, más el `gap` ya existente). Al ser hermano, su clic no navega ni toca el estado del `Link`. Recibe `style={sharedName('cta', transitioning)}`.
- **`features/catalogo/product-detail-page.tsx`**: bajo el precio, `AddToCartButton` con la etiqueta "Agregar al carrito", `style={sharedName('cta', transitioning)}` y, si `atLimit`, el texto "Ya tienes todo el stock disponible en tu carrito" (`aria-live="polite"`). Reemplaza el espacio reservado de HU-08.
- **`src/main.tsx`**: se quita `CartProvider`.

### Componentes del design system

`Button` (primario en el detalle, secundario compacto en la tarjeta y en "Compartir"), `Card`, `Input` (campo de solo lectura del enlace) y `Notification` (éxito y error). La insignia usa `bg-action`/`text-on-action`; no hay tokens nuevos.

## Seguridad

- El código compartido es entrada no confiable: solo se aceptan enteros dentro de los topes, y todo lo demás se descarta. No contiene precios, y el precio y el stock mostrados salen siempre del servidor.
- El carrito no es una barrera de negocio: el límite por `stock` es de experiencia de usuario. La validación real de disponibilidad, stock y precio al confirmar el pedido es del checkout (fuera de alcance), igual que el descuento de stock.
- `GET /api/products?ids=` es público y de solo lectura, con tope de 100 ids para no convertirlo en una consulta ilimitada; no devuelve platos inactivos.
- Lo persistido en `localStorage` se valida al leerlo (no se confía en él) y no contiene datos personales.

## Decisiones

- **Zustand con `persist` en vez de Context**: lo pidió el usuario, y el carrito se lee desde el header, las tarjetas y `/cart` sin re-render de todo el árbol. `AuthContext` sigue en Context.
- **Solo ids y cantidades en el store**: nombre, precio e imagen se piden al servidor al abrir `/cart`, así un enlace no puede traer datos inventados y un cambio de precio se refleja sin migrar `localStorage`.
- **`available` ya combina `stock`**: una sola regla en el backend (`isOrderable()`); el indicador de HU-10, el botón de las tarjetas y el del detalle usan el mismo campo y no pueden contradecirse.
- **`GET /products?ids=` aparte del listado paginado**: tiene otro contrato (lista plana, sin página ni orden, ids desconocidos omitidos) y se mapea con `params = "ids"` para no mezclarlo con `category`, `q` y `page`.
- **Stock 0 conserva el ítem**: quitar un plato agotado en silencio sería peor que mostrarlo "Agotado"; el cliente decide con HU-13.
- **Sin avisos de ajuste, solo el de agotado**: lo que cambia (cantidad ajustada, plato quitado) ya se ve en la propia lista, así que un aviso sería redundante. El plato agotado sí lleva aviso en su fila porque el cliente tiene que decidir qué hacer con él.
- **Botón como hermano del `Link`**: evita `<button>` dentro de `<a>`, que rompe la accesibilidad y el foco, a costa de posicionar el botón sobre el hueco de la tarjeta.
- **Tope técnico de 99 en el código y 100 platos**: mantiene el enlace corto y el endpoint acotado; el límite funcional real es el `stock`, que se aplica al reconciliar.
- **Una sola llave `salazar.carrito`**: se reutiliza la del `CartContext` provisional; su contenido anterior (un arreglo) falla la validación y se descarta, así que no hay migración.
