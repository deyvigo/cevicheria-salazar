# Tareas: HU-16 — Conservar el carrito al cerrar la app sin iniciar sesión

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

- [x] Agregar a `tests/features/carrito/cart-store.test.ts` la prueba de recarga: agregar, cambiar cantidad y rehidratar devuelve los mismos ítems — cubre: conserva al recargar y al cerrar y abrir — verificación: `pnpm test --run cart-store`.
- [x] Agregar la prueba de que `setQuantity` y `remove` actualizan `localStorage` — cubre: ver el carrito tal como lo dejé — verificación: `pnpm test --run cart-store`.
- [x] Agregar la prueba de que un valor guardado antiguo se rehidrata sin descartarse — cubre: sin caducidad — verificación: `pnpm test --run cart-store`.
- [x] Recorrer en navegador: agregar platos sin sesión, recargar, cerrar y abrir el navegador, abrir en dos pestañas, y bloquear `localStorage` (modo privado) — cubre: persistencia, pestañas, `localStorage` no disponible.
- [x] Repasar cada criterio de `spec.md`, correr `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
