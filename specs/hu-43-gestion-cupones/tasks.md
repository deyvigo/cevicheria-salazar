# Tareas: HU-43 — Gestionar los códigos de descuento desde el panel

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] `CouponRequest` (normaliza el código, valida tipo, valor, límites y fechas) y `AdminCouponResponse` — cubre: campos del cupón, código en mayúsculas y sin espacios, errores de validación — verificación: `CouponRequestValidationTest` — un código `" ceviche10 "` queda `CEVICHE10`; porcentaje 120, valor 0, cupos 0 o fin antes del inicio dan error en su campo; un cupón de un solo día es válido.
- [x] Ampliar `Coupon` (`update`, `setActive`) y `CouponRepository` (`findByIdForUpdate`, usos y `hasOrders` por cupón, existencia por código) — cubre: usos con la regla de HU-42, "uso" para eliminar y fijar el código — verificación: `AdminCouponControllerIT` (abajo) con pedidos en distintos estados.
- [x] `AdminCouponService` (listar, crear, editar, cambiar estado, eliminar) con `CouponNotFoundException`, `CouponInUseException` y su manejo en `ApiExceptionHandler` — cubre: crear, editar, código repetido, código fijo tras el primer uso, cupos no menores a los usos, activar/desactivar, eliminar solo sin pedidos, fechas en días de Lima — verificación: `AdminCouponServiceTest` — fechas `startsOn`/`endsOn` se guardan como 00:00 de Lima y fin exclusivo del día siguiente, y vuelven igual en la respuesta; `exhausted` y `expired` se calculan bien; cambiar el código con pedidos falla y sin pedidos funciona; bajar cupos por debajo de los usos falla.
- [x] `AdminCouponController` — cubre: endpoints y acceso solo de administrador — verificación: `AdminCouponControllerIT` (en el paquete de test `pedidos`, para reutilizar `OrderITSupport` y crear pedidos reales) — sin sesión `401`, cliente `403`; crear devuelve `201` y el cupón se puede aplicar en `/api/coupons/quote`; código repetido `409` en `code`; desactivar hace que el checkout responda "Este código no es válido"; con un pedido `PAGADO` la lista muestra `uses = 1` y `hasOrders`, eliminar da `409` y cambiar el código da `400`; con solo un pedido `CANCELADO` muestra `uses = 0` y `hasOrders = true`; un cupón sin pedidos se elimina (`204`) y el checkout ya no lo reconoce; un id inexistente da `404`.

## Frontend

- [x] `admin-coupon-api.ts`, `use-admin-coupons.ts` y `use-admin-coupon-mutations.ts` — cubre: datos de la sección — verificación: los tests de la página y de los componentes con la API simulada.
- [x] Sección en la navegación (`admin-sections.ts`) y ruta `/admin/cupones` — cubre: Cupones entre Pedidos y Reportes — verificación: `tests/features/admin/components/admin-nav.test.tsx` — el orden de los enlaces es Categorías, Platos, Zonas de delivery, Pedidos, Cupones, Reportes.
- [x] `components/coupon-table.tsx` — cubre: columnas, formatos de descuento, cupos y vigencia, etiquetas Agotado/Vencido, interruptor Activo, Eliminar deshabilitado con pedidos — verificación: `tests/features/admin/components/coupon-table.test.tsx`.
- [x] `components/coupon-dialog.tsx` — cubre: crear y editar, campos opcionales vacíos sin límite, validaciones, código deshabilitado con pedidos, errores del servidor bajo su campo — verificación: `tests/features/admin/components/coupon-dialog.test.tsx`.
- [x] `components/delete-coupon-dialog.tsx` — cubre: confirmación al eliminar — verificación: `tests/features/admin/components/delete-coupon-dialog.test.tsx`.
- [x] `admin-coupons-page.tsx` — cubre: carga, error con reintentar, vacío, agregar, editar, cambiar estado (optimista con reversión y aviso si falla) y eliminar — verificación: `tests/features/admin/admin-coupons-page.test.tsx`.

## Documentación

- [x] Actualizar `docs/diagrama-de-casos-de-uso.md`, `docs/diagrama-de-base-de-datos.md`, `specs/hu-42-cupones-de-descuento/spec.md` y `frontend/src/features/admin/README.md` — cubre: impacto en documentación — verificación: revisión de los `.md` tocados.

## Verificación en navegador y cierre

- [ ] Recorrer `/admin/cupones` con la semilla `dev`: ver `CEVICHE10`, `BIENVENIDA5` y `VENCIDO` (marcado Vencido); crear un cupón con cupos y usos por persona, aplicarlo en el checkout, desactivarlo y comprobar el rechazo; editar sus cupos por debajo de los usos; eliminar uno sin pedidos e intentar eliminar uno usado — cubre: criterios de ver, crear, editar, activar y eliminar.
- [ ] Repasar cada criterio de `spec.md`, correr `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm lint`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
