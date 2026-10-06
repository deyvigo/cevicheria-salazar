# Tareas: HU-03 — Recuperar contraseña por correo

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: base compartida

- [x] Extraer el SHA-256 privado de `AuthService` a `TokenHasher` (`common/security`) y usarlo desde `AuthService` — cubre: base para guardar solo el hash del código — verificación: `TokenHasherTest` y los tests existentes de `AuthService` siguen pasando.
- [x] Extraer la regla de contraseña de `RegisterRequest` (mínimo 8, letra y número) a una constante/anotación compartida — cubre: nueva contraseña con las reglas de HU-01 — verificación: `RegisterRequestValidationTest` sigue pasando.

## Backend: persistencia

- [x] Crear la entidad `PasswordResetToken` y `PasswordResetTokenRepository` (`findByTokenHashForUpdate` con `PESSIMISTIC_WRITE` para restablecer, `findByTokenHash` sin bloqueo para validar, `invalidateActiveByUserId`) sobre la tabla existente — cubre: enlace de un solo uso, solo el más reciente válido — verificación: `PasswordResetTokenRepositoryIT` (Postgres de Testcontainers; arranque con Hibernate `validate`, invalidación de tokens previos).
- [x] Agregar `RefreshTokenRepository.revokeAllByUserId` — cubre: sesiones de otros dispositivos se cierran — verificación: `RefreshTokenRepositoryIT`.

## Backend: límite de solicitudes

- [x] Implementar `PasswordResetRequestLimiter` en Redis (`password-reset:requests:<email>`, máximo 3, TTL 24 h) — cubre: mensaje de espera al superar el límite — verificación: `PasswordResetRequestLimiterIT` (Redis real de Testcontainers; la 4.ª solicitud lanza `TooManyAttemptsException`).

## Backend: correo

- [x] Agregar `spring-boot-starter-mail`, propiedades `spring.mail.*` y `app.password-reset.*` (30 min, 3, 24 h), y `SMTP_FROM` a `.env.example` — cubre: base del envío y fuente única de las reglas — verificación: `./mvnw test` arranca el contexto.
- [x] Implementar `MailService.sendPasswordResetEmail` (HTML en español, tuteando, sin emojis) con vigencia, un solo uso, solo el enlace más reciente, límite de solicitudes e "ignóralo si no fuiste tú"; sin `SMTP_HOST` el envío falla con error en el log (no se propaga) — cubre: criterio del contenido del correo — verificación: `MailServiceTest` (el cuerpo contiene el enlace y cada regla, con los valores de las propiedades).

## Backend: servicio y endpoints

- [x] Crear `InvalidResetTokenException` con su `@ExceptionHandler` (`400`, mensaje fijo) — cubre: enlace inexistente/expirado/usado — verificación: cubierto por `PasswordResetControllerIT`.
- [x] Implementar `PasswordResetService.requestReset` (límite → busca cuenta activa → invalida anteriores → genera código y guarda hash → envía; fallo de envío no se propaga) — cubre: correo para cuenta activa, mismo resultado para correo sin cuenta o inactivo, un solo enlace válido, SMTP caído — verificación: `PasswordResetServiceTest` (no envía si no existe/inactiva; guarda hash y no el código; error de `MailService` no se propaga).
- [x] Implementar `PasswordResetService.validate` y `resetPassword` (token válido → actualiza `password_hash`, marca usado, revoca refresh tokens, limpia intentos de login) — cubre: restablecer, enlace de un solo uso, contraseña anterior deja de funcionar, sesiones cerradas, bloqueo de HU-02 limpiado — verificación: `PasswordResetServiceTest` (token expirado, usado, inexistente; efectos secundarios).
- [x] Crear `ForgotPasswordRequest`, `ResetPasswordRequest` y `PasswordResetController` (`POST /api/auth/forgot-password` → `202`, `GET /api/auth/reset-password/validate` → `204`, `POST /api/auth/reset-password` → `204`) — cubre: todos los criterios de backend — verificación: `PasswordResetControllerIT` (flujo completo con Postgres/Redis reales y `MailService` espiado: pedir enlace, validar, restablecer, iniciar sesión con la nueva contraseña y fallar con la anterior; reuso del enlace → `400`; `429` a la 4.ª solicitud; correo inexistente con la misma respuesta; correo/contraseña inválidos → `400` con `fieldErrors`) y `ForgotPasswordRequestValidationTest`/`ResetPasswordRequestValidationTest`.

## Frontend: API y rutas

- [x] Agregar `forgotPassword`, `validateResetToken`, `resetPassword` en `auth-api.ts` y los hooks `useForgotPassword`/`useResetPassword` en `use-auth-mutations.ts` — cubre: llamadas reales al backend — verificación: usados por los tests de las páginas (mockeados).
- [x] Agregar las rutas `/olvide-contrasena` y `/restablecer-contrasena` en `router.tsx` — cubre: acceso a las pantallas — verificación: `pnpm build` compila sin errores.

## Frontend: pantallas

- [x] Agregar el enlace "¿Olvidaste tu contraseña?" en `login-page.tsx` hacia `/olvide-contrasena` — cubre: redirect desde el login — verificación: `login-page.test.tsx` (el enlace existe y apunta a la ruta).
- [x] Construir `forgot-password-page.tsx` (`react-hook-form` + `zod`, solo `email`): campo vacío o formato inválido sin enviar; éxito muestra el mensaje genérico; `429` muestra el mensaje de espera como error de formulario — cubre: pedir el correo, correo inválido, límite — verificación: `forgot-password-page.test.tsx`.
- [x] Construir `reset-password-page.tsx`: valida el código al abrir (inválido/ausente → mensaje con enlace a `/olvide-contrasena`); formulario con contraseña + confirmación (reglas de HU-01, coincidencia); éxito → login con estado `passwordReset`; `400` por código al enviar → mensaje de enlace inválido — cubre: formulario de nueva contraseña, reglas de contraseña, enlace inválido/vencido — verificación: `reset-password-page.test.tsx`.
- [x] Mostrar en `login-page.tsx` el `Notification` de éxito "Tu contraseña fue actualizada. Inicia sesión." cuando llega `state.passwordReset` — cubre: mensaje de éxito tras restablecer — verificación: `login-page.test.tsx`.

## Verificación cruzada

- [x] `./mvnw test` (80/80) y `./mvnw test -Dtest='*IT'` (27/27) y `pnpm test --run` (49/49) pasan. `pnpm build` compila sin errores tras renombrar a kebab-case los componentes que tenían mayúscula (`Button.tsx` → `button.tsx`, etc.), que causaban un error TS1261 previo y ajeno a la historia.
- [x] Prueba manual end-to-end con `./scripts/dev.sh` (con SMTP real configurado en `backend/.env`; la prueba la hace el usuario desde su bandeja de entrada): pedir enlace, abrir `/restablecer-contrasena?token=...`, cambiar contraseña, iniciar sesión con la nueva, comprobar que el enlace no se puede reutilizar y que una solicitud posterior invalida la anterior. Hecha por el usuario: el flujo completo funciona con el SMTP real de Gmail.
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final y marcar la spec como **Hecha**.
