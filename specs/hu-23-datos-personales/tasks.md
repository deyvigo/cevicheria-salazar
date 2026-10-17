# Tareas: HU-23 — Ver y editar mis datos personales

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] `PhoneRules` compartido y `RegisterRequest` lo usa sin cambiar su comportamiento — cubre: mismo formato de teléfono que el registro — verificación: tests existentes de registro siguen pasando.
- [x] `User.updateProfile` y `changePassword` público; `UserResponse.hasPassword` — cubre: editar datos, diálogo "Crear/Cambiar contraseña" — verificación: `ProfileServiceTest` (`User.updateProfile`) y `ProfileControllerIT` (`hasPassword` con y sin hash en `/api/auth/me`).
- [x] `RefreshTokenRepository.revokeAllByUserIdExcept` — cubre: cerrar las otras sesiones y conservar la actual — verificación: cubierto por `ProfileIT`.
- [x] `FieldInvalidException` y handler `400` con `fieldErrors` — cubre: errores por campo de contraseña — verificación: `ProfileIT`.
- [x] `PasswordChangeAttemptService` (3 intentos, 15 minutos, por usuario) — cubre: bloqueo por contraseña actual incorrecta — verificación: `PasswordChangeAttemptServiceTest` con Redis simulado — bloquea al cuarto, `recordSuccess` limpia, no usa la clave del login.
- [x] `UpdateProfileRequest`, `ChangePasswordRequest`, `ProfileService` y `ProfileController` — cubre: editar datos básicos y contraseña — verificación: `ProfileServiceTest` — actualiza campos con `trim`; contraseña actual incorrecta falla y cuenta intento; nueva igual a la actual falla; cuenta Google crea contraseña sin pedir la actual; con éxito revoca las demás sesiones y limpia intentos; el administrador también puede editar su cuenta (HU-36).
- [x] `ProfileIT` (Postgres y Redis reales) — cubre: todos los criterios de API — verificación: sin sesión `401`; un administrador puede editar su cuenta (HU-36); `PUT /api/perfil` válido `200` y `GET /api/auth/me` refleja los cambios; vacío o teléfono inválido `400` con el campo; contraseña con otra sesión abierta: la otra falla en `/api/auth/refresh`, la actual no; contraseña actual incorrecta `400` en `currentPassword`; cuarto intento `429`; cuenta Google crea contraseña y luego puede iniciar sesión con ella.

## Frontend: base

- [x] `AuthUser.hasPassword` y mocks de tests actualizados — cubre: diálogo de contraseña correcto — verificación: `pnpm build` sin errores de tipos.
- [x] `components/dialog.tsx` (panel propio con foco atrapado, no `<dialog>` nativo) — cubre: edición dentro de un diálogo, cierre con Cancelar, Escape o scrim — verificación: `tests/components/dialog.test.tsx` — no renderiza abierto sin `open`; muestra título y contenido; Escape y clic en el scrim llaman `onClose`; devuelve el foco al cerrar.
- [x] `header.tsx`: "Mi perfil" solo para Clientes — cubre: menú de cuenta — verificación: `tests/components/header.test.tsx` — cliente ve el enlace a `/perfil`; administrador y visitante no.

## Frontend: perfil

- [x] `profile-api.ts`, `use-profile-mutations.ts` — cubre: guardar datos y contraseña, nombre del header actualizado — verificación: `tests/features/perfil/use-profile-mutations.test.tsx` — tras guardar, `ME_QUERY_KEY` tiene los datos nuevos; tras cambiar contraseña, `hasPassword` es `true`.
- [x] `profile-sections.ts`, `components/profile-nav.tsx` — cubre: navegación vertical con "Mi información" — verificación: `tests/features/perfil/components/profile-nav.test.tsx` — muestra la sección con su ruta; la actual tiene `aria-current="page"`; "Cerrar sesión" cierra y lleva a `/`; si falla muestra el error y no navega.
- [x] `profile-guard.tsx` (tras cerrar sesión no redirige al login, deja que el header navegue a `/`), `profile-layout.tsx`, `profile-not-found.tsx` y rutas en `router.tsx` (dentro de `Layout`, `index` → `/perfil/mi-informacion`) — cubre: header se mantiene, redirección, 404 interno, visitante y administrador — verificación: `tests/features/perfil/profile-layout.test.tsx` — `/perfil` redirige a `/perfil/mi-informacion`; el header y la navegación conviven; `/perfil/otra` muestra "Página no encontrada" con la navegación; sin sesión redirige a `/iniciar-sesion` conservando `from`; cerrar sesión desde el header termina en `/`; administrador ve la página 404; con `isLoading` no renderiza nada.
- [x] `my-information-page.tsx` — cubre: ver los datos, teléfono "No registrado", botón según `hasPassword` — verificación: `tests/features/perfil/my-information-page.test.tsx` — muestra nombres, apellidos, teléfono y correo; usuario sin teléfono ve "No registrado"; con `hasPassword` ve "Cambiar contraseña", sin él "Crear contraseña".
- [x] `components/edit-profile-dialog.tsx` — cubre: editar datos básicos (validaciones, sin cambios, descarte, error de servidor, éxito) — verificación: `tests/features/perfil/components/edit-profile-dialog.test.tsx` — valores cargados; vacíos y teléfono inválido muestran el error y no envían; "Guardar" deshabilitado sin cambios; cerrar y reabrir restaura los valores guardados; error del servidor deja el diálogo abierto con las ediciones y el mensaje; éxito cierra y notifica.
- [x] `components/change-password-dialog.tsx` — cubre: cambiar o crear contraseña (reglas, coincidencia, distinta de la actual, errores de servidor, `429`, campos vacíos al reabrir) — verificación: `tests/features/perfil/components/change-password-dialog.test.tsx` — con `hasPassword` pide la actual y sin él no; contraseñas que incumplen reglas o no coinciden no envían; error `currentPassword` se muestra en su campo; `429` muestra el mensaje; reabrir deja los campos vacíos; éxito cierra y notifica.

## Verificación cruzada

- [x] Prueba en navegador (`./scripts/dev.sh`) como Cliente: "Mi perfil" en el menú lleva a `/perfil/mi-informacion`; header visible con la navegación vertical; editar datos actualiza pantalla y nombre del header; cancelar o Escape descarta; cambiar contraseña con la actual incorrecta falla en el campo; con 4 intentos erróneos bloquea; con la sesión abierta en otro navegador, ese navegador pierde la sesión al refrescar tras el cambio; cuenta Google ve "Crear contraseña" y luego puede entrar con correo y contraseña; recargar en `/perfil/mi-informacion` conserva la pestaña; cerrar sesión desde `/perfil` termina en `/` con el aviso "Cerraste sesión" (no en el login); sin sesión `/perfil` lleva al login y vuelve al perfil; como administrador `/perfil` muestra 404 y el menú no ofrece "Mi perfil".
- [x] Antes de commitear: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`.
- [x] Marcar HU-23 en `docs/cronograma.md`; recorrer cada criterio de `spec.md` contra la implementación y marcar la spec como **Hecha**.
