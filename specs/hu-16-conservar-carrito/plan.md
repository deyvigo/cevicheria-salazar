# Plan: HU-16 — Conservar el carrito al cerrar la app sin iniciar sesión

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios. El carrito no se guarda en el servidor; `GET /api/products?ids=` (HU-12) ya reconcilia precio, existencia y stock.

## Frontend

Sin código de producción nuevo: `cart-store.ts` ya cumple la spec. El trabajo es cerrar las brechas de prueba y verificar en navegador.

- **Pruebas existentes** (`tests/features/carrito/cart-store.test.ts`): persistencia de solo `items`, `localStorage` que lanza, contenido corrupto, arreglo antiguo y rehidratación por `storage`.
- **Pruebas a agregar** en el mismo archivo:
  - Recarga: tras agregar y cambiar cantidades, `useCartStore.persist.rehydrate()` desde el valor guardado devuelve los mismos ítems (simula recargar y volver a abrir).
  - Persistencia de cambios: `setQuantity` y `remove` actualizan `localStorage` (no queda el estado anterior).
  - Sin caducidad: un valor guardado con una marca de tiempo antigua no se descarta (el store no guarda fecha; la prueba fija que no existe lógica de expiración).
- **Reconciliación** ya cubierta en `cart-page.test.tsx` y `cart-store.test.ts` (`reconcile`); no se duplica.

## Seguridad

- El valor guardado se valida como entrada no confiable con `zod` (`parseItems`) y se recorta a `MAX_PRODUCTS` y `MAX_QUANTITY`; no contiene precios ni datos personales.

## Decisiones

- **Sin caducidad**: no se agrega fecha ni limpieza; el backend reconcilia al abrir `/cart` (spec).
- **No se agrega ningún mecanismo nuevo de almacenamiento** (IndexedDB, cookies): `localStorage` basta para el tamaño del carrito.

## Impacto en docs/

- Ninguno.
