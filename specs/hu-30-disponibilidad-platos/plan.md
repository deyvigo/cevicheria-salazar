# Plan: HU-30 — Marcar platos como disponibles o agotados

`spec.md` en estado Clarificada.

## Backend

Sin cambios: se reutiliza `PUT /api/admin/products/{id}` de HU-29 (protegido por `AdminAccessInterceptor`, con el cuerpo `multipart` de `data` y la lista final de imágenes). No hay migración.

## Frontend

### Componentes (`src/`)

- **`components/switch.tsx`** (compartido, `role="switch"`, `aria-checked`, `aria-label`): pista `lima-300` activada / `naranja-200` desactivada y círculo `surface` que se desliza con `transition-transform duration-200` (con `motion-reduce:transition-none`). Deshabilitado mientras se guarda. El diálogo de HU-29 lo usa con `Controller` de `react-hook-form`.
- **`features/admin/components/product-table.tsx`**: las columnas Activo y Disponible renderizan un `Switch` por fila con el nombre accesible `Activo: <plato>` / `Disponible: <plato>`; recibe `isOn`, `isSaving` y `onToggle` de la página.
- **`features/admin/admin-products-page.tsx`**: `toggle(product, field, value)` guarda con `useUpdateProduct` (de HU-29) el `PUT` con todos los datos e imágenes del plato (`images` como `{ id }` de las ya guardadas). Un estado `saving` por `id:campo` muestra el valor nuevo de inmediato (el círculo se desliza sin esperar al servidor) y bloquea ese interruptor; al terminar se quita y, como la mutación invalida y espera la recarga de `['admin', 'products']`, la lista ya trae el valor confirmado. Si falla, el valor vuelve al anterior y se muestra una `Notification` de error ("No pudimos actualizar el plato, intenta de nuevo"). El valor del otro interruptor que aún se guarda se manda con el nuevo cambio para no deshacerlo.
- Design system: solo tokens existentes (`lima-300`, `naranja-200`, `surface`); sin tokens nuevos.

## Seguridad

Igual que HU-29: la autorización vive en el servidor; el cambio de estado usa el mismo `PUT` validado.

## Decisiones

- **`PUT` completo en lugar de `PATCH`**: evita un endpoint nuevo para dos booleanos; a cambio, el cambio envía todos los datos del plato (ver el caso borde del último guardado).
- **Valor optimista local, no de la caché**: se mantiene en la página mientras la petición está en vuelo, para no manipular la caché de React Query y poder revertir con facilidad si falla.
- **`is_available` y `stock` independientes**: la regla de "se puede pedir" sigue siendo `Product.isOrderable()`.

## Impacto en docs/

- `docs/cronograma.md`: HU-30 en el Sprint 2, semana 1, marcada como hecha.
- Sin cambios en los diagramas ni en el modelo de datos.
