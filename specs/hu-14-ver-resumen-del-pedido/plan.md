# Plan: HU-14 — Ver subtotal, costo de delivery y total

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios. Los precios y la disponibilidad ya llegan en `GET /api/products?ids=` (HU-12), que es lo único que necesita el resumen. El servidor recalculará los montos al crear el pedido (E4).

## Frontend

Todo en `frontend/src/features/carrito/`.

### Cálculo (`order-summary.ts`)

Función pura, sin React, para poder probarla aislada:

- `DELIVERY_FEE = 5` y `DISCOUNT = 0` como constantes con nombre; son el único lugar a tocar cuando existan tarifas por zona o descuentos reales.
- `computeOrderSummary(items, productsById)` devuelve `{ subtotal, discount, delivery, total }` o `null` si falta algún plato por cargar.
  - Suma `price × quantity` solo de los platos con `available = true`; los agotados no suman (spec).
  - Trabaja en **céntimos enteros** (`Math.round(price * 100) * quantity`) y convierte a soles al final, para que `12.90 × 3` dé `38.70` y no `38.69999`.
  - `total = subtotal − discount + delivery`. No se limita `discount` al subtotal porque hoy es 0; se anota para cuando haya descuentos reales.
  - Devuelve `null` cuando hay alguna fila sin `product` en `productsById`: así el resumen nunca muestra un monto parcial (ni al cargar ni al importar un carrito compartido cuyos platos aún no llegan; con `keepPreviousData` los platos ya conocidos siguen disponibles al quitar una fila).

### Componente (`components/order-summary.tsx`)

- Recibe `summary: OrderSummary | null`. Con `null` muestra un esqueleto (`animate-pulse`, `bg-surface-celeste`, como las filas de `/cart`) y `aria-busy`.
- Es un `<section aria-labelledby>` con encabezado "Resumen del pedido" y una `<dl>`: cada fila es `<dt>` (etiqueta) + `<dd>` (monto con `formatPrice`, alineado a la derecha). Subtotal, Descuento, Delivery y, tras un separador `border-t`, Total con `font-display`, mayor tamaño y peso.
- Estilos con tokens del `design-system/` (superficie `Card`: `bg-surface`, `border-border`, `rounded-lg`, `shadow-sm`); sin colores ni espaciados nuevos.
- No es una región `aria-live`: leer cada cambio de cantidad interrumpiría; los montos se leen en orden al navegar.

### Carrito (`cart-page.tsx`)

- El contenedor pasa de `max-w-3xl` a `max-w-5xl`.
- Con platos en el carrito y sin error, el contenido es un grid de dos columnas: lista a la izquierda y, a la derecha, `<aside>` con `border-l border-border pl-6` (la **línea vertical**) que aloja `OrderSummary`. El `<aside>` es `sticky` bajo el header para que acompañe a la lista al hacer scroll.
- `summary = computeOrderSummary(items, productsById)` se calcula en el render a partir de `items` del store y `query.data`; se recalcula solo al cambiar cantidades, eliminar o refrescar precios.
- Con carrito vacío o `query.isError` no se renderiza el `<aside>` (sin línea ni resumen); se mantienen los estados actuales.
- Título, "Compartir", filas y foco no cambian.

### Formato

Se reutiliza `formatPrice` de `features/catalogo/format.ts` (`S/ 32.00`); no se crea otro formateador.

### Componentes del design system

Superficie de `Card` y tokens de `tokens.json` tal cual. No hay componente nuevo en el design system.

## Seguridad

- Los montos son solo informativos: se derivan de datos del catálogo y de una cantidad ya normalizada por el store (HU-13). Nunca se envían como fuente de verdad; el servidor recalcula en el checkout.

## Decisiones

- **Céntimos enteros** en el cálculo en lugar de sumar decimales, para evitar errores de coma flotante.
- **`null` en vez de total parcial** mientras falten precios: es preferible un esqueleto a un total incorrecto.
- **Constantes en un módulo propio** (`order-summary.ts`) y no en el componente: la tarifa fija es provisional y HT-02 (zonas) la reemplazará sin tocar la UI.
- **Sin estado nuevo en el store**: el resumen es derivado, no se persiste.
- **Sin cambios de backend ni de modelo de datos.**

## Impacto en docs/

- `frontend/src/features/carrito/README.md`: mencionar `order-summary.ts`, `OrderSummary` y las constantes de delivery/descuento.
- `docs/` (arquitectura, base de datos): sin cambios.
