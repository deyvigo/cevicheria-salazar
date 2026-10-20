# Tareas: HU-30 — Marcar platos como disponibles o agotados

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Frontend

- [x] `components/switch.tsx` — cubre: interruptor (estados, clic, teclado, accesibilidad, animación) — verificación: `tests/components/switch.test.tsx` — expone `aria-checked` y se invierte al hacer clic; se activa con Enter; no responde si está deshabilitado.
- [x] Interruptores de Activo y Disponible en `components/product-table.tsx` y `toggle` en `admin-products-page.tsx` — cubre: cambio desde la tabla, bloqueo mientras guarda, error con reversión y cambios simultáneos (conservar búsqueda, orden y página es estructural: el cambio no toca la URL) — verificación: `tests/features/admin/admin-products-page.test.tsx` — cada fila muestra sus dos interruptores con el estado del plato; un clic envía el `PUT` con los demás datos e imágenes, deja el interruptor en el valor nuevo y bloqueado mientras guarda; si falla vuelve al valor anterior y muestra "No pudimos actualizar el plato, intenta de nuevo".
- [x] `Switch` en `components/product-dialog.tsx` (Activo y Disponible, en una fila, mitad y mitad) — cubre: coherencia con la tabla — verificación: `tests/features/admin/components/product-dialog.test.tsx`.

## Verificación cruzada

- [x] Prueba en navegador (`./scripts/dev.sh`) como Administrador: en `/admin/platos`, cambiar Disponible de un plato con stock (la tienda lo muestra "Agotado" al recargar y se puede volver a activar); cambiar Activo (desaparece de la tienda y sigue en el panel); el círculo se desliza con animación suave y los colores son los del design system; con el servidor detenido el interruptor vuelve a su estado y avisa; el cambio conserva `?q=`, `?sort=` y `?page=`.
- [x] Antes de commitear: `pnpm test --run` y `pnpm build`.
- [x] Marcar HU-30 en `docs/cronograma.md`; recorrer cada criterio de `spec.md` contra la implementación y marcar la spec como **Hecha**.
