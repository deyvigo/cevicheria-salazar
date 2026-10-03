# Tareas: HU-02 — Iniciar sesión

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: repositorio y validación

- [x] Agregar `UserRepository.findByEmail(String email)` — cubre: base para encontrar la cuenta al iniciar sesión — verificación: usado por `AuthServiceTest`/`AuthControllerIT`/`LoginAttemptServiceIT`.
- [x] Crear `LoginRequest` (DTO, record) con `email` (`@NotBlank @Email`) y `password` (`@NotBlank`, sin el patrón de complejidad de HU-01), normalizando el correo en el constructor compacto (trim + minúsculas) — cubre: campos obligatorios vacíos — verificación: `LoginRequestValidationTest` — **7/7 tests pasan**.

## Backend: anti fuerza bruta (Redis)

- [x] Implementar `LoginAttemptService` (`checkNotBlocked`, `recordFailure`, `recordSuccess`) sobre `StringRedisTemplate`, clave `login:attempts:<email>`, máximo 3 intentos, TTL 15 min — cubre: bloqueo al cuarto intento fallido — verificación: `LoginAttemptServiceIT` (Redis real de Testcontainers) — **2/2 tests pasan** (bloquea al 4° intento; un éxito resetea el contador).

## Backend: excepciones

- [x] Crear `InvalidCredentialsException` y `TooManyAttemptsException` en `common/exception`, con sus `@ExceptionHandler` agregados a `ApiExceptionHandler` (401 sin `fieldErrors` / 429) — cubre: mensaje genérico, mensaje de bloqueo — verificación: cubierto por `AuthControllerIT` (ver abajo); no se duplicó en `ApiExceptionHandlerTest` porque ya prueba el patrón genérico con otras excepciones.

## Backend: servicio y endpoint

- [x] Implementar `AuthService.login(...)`: `checkNotBlocked` → busca por correo → verifica contraseña/`is_active` → `recordFailure` (y lanza `InvalidCredentialsException`) o `recordSuccess` + JWT + refresh token — cubre: login exitoso, correo inexistente, contraseña incorrecta, cuenta inactiva (las tres últimas con el mismo error) — verificación: `AuthServiceTest` — **7/7 tests pasan**, incluido que el chequeo de bloqueo ocurre antes de tocar `UserRepository`.
- [x] Implementar `AuthController.login` (`POST /api/auth/login`): `200` + cookies en éxito, `401` en credenciales inválidas, `429` en bloqueo — cubre: todos los criterios de backend — verificación: `AuthControllerIT` — **8/8 tests pasan** (login exitoso, contraseña incorrecta, correo inexistente, cuenta inactiva, bloqueo tras 3 intentos, más los 3 de registro de HU-01).

## Frontend: pantalla de inicio de sesión

- [x] Construir `LoginPage` (`/iniciar-sesion`) con `react-hook-form` + `zod` (solo `email`/`password` obligatorios, sin la regla de complejidad), usando `Input`/`Button` ya existentes — cubre: campos vacíos, correo con formato inválido — verificación: `LoginPage.test.tsx` — **5/5 tests pasan**.
- [x] Agregar `authApi.login` (mismo archivo que `register`) — cubre: llamada real al backend — verificación: usado por `LoginPage.test.tsx` (mockeado) y la prueba manual end-to-end por HTTP (ver abajo).

## Frontend: integración

- [x] Conectar el formulario a `POST /api/auth/login`: en éxito `useAuth().setUser(...)` + redirigir a `/`; en `401`/`429` mostrar el mensaje de la `ApiError` como error de formulario (`setError('root', ...)`), sin asociarlo a un campo — cubre: login exitoso, mensaje genérico, mensaje de bloqueo — verificación: `LoginPage.test.tsx` (200 actualiza la sesión; 401 y 429 muestran su mensaje respectivo sin tocar `errors.email`/`errors.password`).
- [x] Agregar la ruta `/iniciar-sesion` en `router.tsx` — cubre: acceso a la pantalla — verificación: `pnpm build` compila sin errores con la ruta agregada.

## Verificación cruzada

- [x] Prueba manual end-to-end real por HTTP (backend + Postgres/Redis reales, sin mocks): registro de prueba, login exitoso (`200` + cookies), contraseña incorrecta (`401`, mensaje genérico), correo inexistente (`401`, mismo mensaje), cuenta inactiva forzada en la BD (`401`, mismo mensaje), y bloqueo tras 3 fallos — el 4° intento devuelve `429` **incluso con la contraseña correcta**, confirmando que `checkNotBlocked` corre antes de verificar credenciales. Verificado también el contador en Redis (`GET`/`TTL` de `login:attempts:<email>`). **Pendiente**: la misma prueba manual pero desde el navegador contra `LoginPage` (solo se verificó el backend por HTTP directo y el frontend con mocks).
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final — todos verificados. Se marca la spec como **Hecha**.
