# Plan: HU-10 — Saber si un plato está agotado o no disponible

`spec.md` en estado Clarificada.

## Backend

### Base de datos

Migración `V3__product_availability.sql`:

```sql
ALTER TABLE products ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT true;
```

- `NOT NULL DEFAULT true`: los platos existentes quedan disponibles y un `INSERT` que no la mencione (la semilla, tests, HU-29 más adelante) también.
- Sin índice: no se filtra ni se ordena por esta columna.
- Actualizar `docs/diagrama-de-base-de-datos.md` (tabla `products`): `is_available` indica si el plato se puede pedir hoy; un plato agotado sigue visible, a diferencia de `is_active`.

### Capas (paquete `com.salazar.api.catalogo`)

- **`Product`**: campo `available` mapeado a la columna `is_available` (`@Column(name = "is_available", nullable = false)`), `true` en el constructor, con getter (`@Getter` de la clase). Se agrega `markUnavailable()` espejo de `deactivate()`, solo para que los tests y la semilla puedan fijar el estado; HU-30 define cómo el administrador lo cambia de verdad.
- **`dto/ProductDetailResponse`**: agrega `available` (`boolean`). `CatalogService.getProduct` lo llena desde la entidad.
- **`ProductResponse`** (listado), `CatalogController`, seguridad y endpoints: sin cambios. No hay endpoint de escritura.

### Datos de ejemplo

`R__sample_products.sql` agrega al final un `UPDATE products SET is_available = false WHERE name IN (...)` para tres platos (uno por categoría distinta, por ejemplo "Ceviche de erizo", "Chicharrón de pota" y "Chicha morada"). Idempotente: reejecutarlo deja el mismo estado.

## Frontend

### Archivos (`src/features/catalogo/`)

- **`catalog-api.ts`**: `ProductDetail` agrega `available: boolean | null`. `null` significa "aún no confirmado": lo usa el placeholder construido desde la lista (que no trae disponibilidad).
- **`use-catalog-queries.ts`**: el `placeholderData` de `useProduct` devuelve `available: null`.
- **`components/availability-badge.tsx`** (nuevo): recibe `available: boolean | null`.
  - `null` → no renderiza nada; la fila ya tiene la altura de la categoría (`h-6`), así que nada se mueve al llegar el estado.
  - Es una pastilla (`inline-flex items-center gap-2 rounded-full px-3 text-sm font-bold`). `true` → `bg-success-surface text-success-text`, punto + "Disponible". `false` → `bg-error-surface text-error-text`, punto + "Agotado".
  - El punto es un `<span aria-hidden>` de `h-2 w-2 rounded-full bg-current`, centrado verticalmente con el texto. Los tokens `success-*` y `error-*` ya están expuestos como utilities. Sin SVG. El texto es lo que lee el lector de pantalla.
- **`product-detail-page.tsx`**: monta `<AvailabilityBadge available={product.available} />` en la fila de la categoría: `flex items-center justify-between`, categoría a la izquierda y badge a la derecha.

### Componentes del design system

Pares `lima` (éxito) y `coral` (error) vía los tokens `success-*` y `error-*`. El punto va siempre acompañado del texto, como pide `design-system/components/Notification/README.md` (el significado nunca depende solo del color). No se usan íconos ni los SVG de `design-system/assets/Notificaciones/`.

## Seguridad

- Solo lectura y pública, igual que el detalle. No hay ningún camino de escritura: la columna solo se modifica por migración o semilla hasta HU-30.
- El indicador es informativo: el cliente no es la barrera. Cuando existan carrito y checkout, el servidor debe validar la disponibilidad (ver Fuera de alcance de la spec).

## Decisiones

- **Columna `is_available` aparte de `is_active`**: dos significados distintos (visible vs. se puede pedir hoy); mezclarlos ocultaría los platos agotados del catálogo, que es justo lo que la historia no quiere.
- **`available: boolean | null` en el frontend en vez de asumir `true`**: un "Disponible" provisional sería engañoso para un plato agotado; `null` reserva el espacio sin afirmar nada.
- **El listado no cambia**: la historia pide el detalle; agregar el campo al listado sin usarlo ensancharía el contrato sin necesidad. Cuando se quiera en tarjetas se agrega ahí.
- **`markUnavailable()` en la entidad**: lo mínimo para probar; la API de escritura real es de HU-30.
