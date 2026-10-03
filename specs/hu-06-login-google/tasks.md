# Tareas: HU-06 — Registrarse o iniciar sesión con Google

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: configuración

- [x] Agregar `spring.security.oauth2.client.registration.google.client-id/client-secret/scope` y la nueva propiedad `app.frontend-url` a `application.yml`; agregar `APP_FRONTEND_URL` a `backend/.env.example` — cubre: base para todo el flujo — verificación: la app arranca sin errores con las credenciales reales en `.env`, y `GET /oauth2/authorization/google` devuelve `302` a `accounts.google.com` con el `client_id`/`redirect_uri` correctos.

## Backend: modelo

- [x] Agregar `UserRepository.findByGoogleId(String googleId)` — cubre: encontrar una cuenta ya vinculada a Google — verificación: usado por `AuthServiceTest`.
- [x] Agregar `User.fromGoogle(email, googleId, firstName, lastName)` (método estático: cuenta nueva sin contraseña ni teléfono, `email_verified=true`) y `User.linkGoogleAccount(googleId)` (vincula una cuenta existente de HU-01) — cubre: cuenta nueva por Google, vínculo de cuenta existente por correo — verificación: `AuthServiceTest` revisa los valores por defecto.

## Backend: cookies compartidas

- [x] Extraer `SessionCookieFactory` (`common/security/`) desde `AuthController.withSessionCookies`, y hacer que `AuthController` lo use — cubre: evita duplicar los atributos de las cookies para el handler de Google — verificación: `AuthControllerIT` (register/login) sigue en **8/8** sin cambios de comportamiento.

## Backend: servicio

- [x] Implementar `AuthService.loginWithGoogle(googleId, email, firstName, lastName, userAgent)`: busca por `googleId` → por correo (chequea `is_active` **antes** de vincular) → crea con `User.fromGoogle(...)` — cubre: cuenta nueva, cuenta ya vinculada, vínculo de cuenta existente, cuenta inactiva — verificación: `AuthServiceTest` — **4 tests nuevos**, uno por rama (total del archivo: 11/11).

## Backend: handlers y seguridad

- [x] Implementar `OAuth2SuccessHandler` — cubre: login/registro exitoso con Google, cuenta inactiva, perfil de Google sin `given_name` — verificación: `OAuth2SuccessHandlerTest` — **3/3 tests pasan** (cookies + redirección correctas; sin cookies cuando está inactiva; *fallback* de nombre).
- [x] Implementar `OAuth2FailureHandler` — cubre: cancelar o rechazar el acceso en Google — verificación: `OAuth2FailureHandlerTest` — **1/1 test pasa**.
- [x] Agregar `.oauth2Login(...)` a `SecurityConfig` con ambos handlers — cubre: habilita `/oauth2/authorization/google` y el callback — verificación: probado manualmente (ver arriba); también se agregó `@WithTestSecrets` (meta-anotación nueva) a los tres tests `@SpringBootTest` existentes, porque Spring Boot exige un `client-id` no vacío para arrancar el contexto aunque sea de prueba.

## Frontend: botón de Google

- [x] Crear `GoogleLoginButton` (`src/features/auth/`) — cubre: botón visible y funcional — verificación: `GoogleLoginButton.test.tsx` — **1/1 test pasa** (el `href` apunta a `{origen sin /api}/oauth2/authorization/google`).
- [x] Agregar `GoogleLoginButton` a `RegisterPage` y `LoginPage` — cubre: "es una sola acción, no dos distintas" — verificación: un test en cada archivo confirma que el botón está presente, más `pnpm build` sin errores.

## Frontend: manejo del error

- [x] En `LoginPage`, leer `?error=google` de la URL y mostrarlo con `setError('root', ...)` — cubre: mensaje al cancelar o fallar el login — verificación: test de `LoginPage` con `?error=google` en la URL — pasa.

## Verificación cruzada

- [x] **Prueba manual real en navegador**: confirmada por el usuario — crea la cuenta la primera vez, inicia sesión sin duplicarla las veces siguientes, y el flujo funciona de punta a punta con una cuenta de Google real.
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final — todos verificados. Se marca la spec como **Hecha**.
