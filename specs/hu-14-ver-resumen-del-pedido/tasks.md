# Tareas: HU-14 — Ver subtotal, costo de delivery y total

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Frontend

- [x] Crear `order-summary.ts` con `DELIVERY_FEE`, `DISCOUNT` y `computeOrderSummary` — cubre: montos del resumen, plato agotado excluido, todos agotados, decimales, platos aún sin cargar — verificación: `tests/features/carrito/order-summary.test.ts` — `2 × 32.00 + 1 × 18.50` da subtotal `82.50`, descuento `0`, delivery `5` y total `87.50`; `12.90 × 3` da `38.7` exacto; un plato con `available = false` no suma; con todos agotados subtotal `0` y total `5`; con un plato sin `product` devuelve `null`; con carrito vacío el subtotal es `0`.
- [x] Crear `components/order-summary.tsx` — cubre: filas Subtotal / Descuento / Delivery / Total en orden, formato `S/ 0.00`, Total destacado, estado de carga, región accesible — verificación: `tests/features/carrito/components/order-summary.test.tsx` — muestra las cuatro etiquetas en ese orden con sus montos en formato `S/ xx.xx`; Descuento `S/ 0.00` y Delivery `S/ 5.00`; con `summary = null` no muestra montos y marca `aria-busy`; la región se llama "Resumen del pedido" y cada monto queda asociado a su etiqueta.
- [x] Integrar el resumen en `cart-page.tsx`: contenedor `max-w-5xl`, grid lista + `<aside>` con línea vertical, sticky — cubre: layout lista/línea/resumen, actualización al instante, carrito vacío, error, carrito compartido — verificación: `tests/features/carrito/cart-page.test.tsx` — con platos se ve el resumen con los montos correctos; **+**, **−** y el campo actualizan Subtotal y Total sin recargar; "Eliminar" recalcula sin ese plato; quitar el último muestra "Tu carrito está vacío" y no hay resumen; mientras cargan los precios el resumen no muestra montos; con `query.isError` no hay resumen; un plato agotado no suma al Subtotal; abrir `/cart?c=...` importa los platos y el resumen los refleja.

## Documentación

- [x] Actualizar `frontend/src/features/carrito/README.md` (`order-summary.ts`, `OrderSummary`, constantes de delivery y descuento) — cubre: impacto en documentación — verificación: revisión del `.md` tocado.

## Verificación en navegador y cierre

- [x] Recorrer `/cart` en navegador con la semilla `dev`: ver la línea vertical y el resumen a la derecha; cambiar cantidades con **+**, **−** y teclado y ver Subtotal y Total moverse; quitar platos hasta el estado vacío; comprobar que el resumen acompaña al hacer scroll con una lista larga — cubre: layout, actualización al instante, carrito vacío.
- [x] Probar casos borde en navegador: plato agotado en el carrito (no suma), carrito compartido por enlace, recarga con red lenta (esqueleto sin montos parciales), dos pestañas abiertas, precios con decimales — cubre: casos borde.
- [x] Revisar con teclado y lector de pantalla que "Resumen del pedido" se anuncia como región y los montos se leen junto a su etiqueta — cubre: accesibilidad.
- [x] Repasar cada criterio de `spec.md`, correr `pnpm test --run` y `pnpm build` (sin cambios de backend) y pasar la spec a **Hecha** — cubre: cierre.
