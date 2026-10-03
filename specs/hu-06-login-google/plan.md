# Plan: HU-06 — Registrarse o iniciar sesión con Google

`spec.md` en estado Clarificada.

## Backend

### Flujo (no es un endpoint REST propio)

A diferencia de HU-01/HU-02, esto no es un `@RestController`: son los endpoints que ya registra `spring-boot-starter-security-oauth2-client` al activar `oauth2Login()` en `SecurityConfig`.

1. El frontend navega (no un `fetch`/axios) a `GET /oauth2/authorization/google`.
2. Spring Security redirige a la pantalla de consentimiento de Google.
3. Google redirige a `GET /login/oauth2/code/google` (el callback, ya resuelto por la librería).
4. Nuestro `OAuth2SuccessHandler` (o `OAuth2FailureHandler` si Google reporta un error o la persona cancela) toma el control desde ahí.

### Configuración

- `application.yml`: `spring.security.oauth2.client.registration.google.client-id/client-secret/scope: email, profile` (el resto del proveedor Google ya viene integrado en Spring Security, no hace falta declarar authorization-uri/token-uri/etc.).
- Nueva propiedad `app.frontend-url` (`APP_FRONTEND_URL`, default `http://localhost:5173`): a dónde redirige el backend al terminar. Separada de `app.cors.allowed-origins` aunque hoy tengan el mismo valor — son conceptos distintos (orígenes permitidos vs. destino de una redirección).
- `backend/.env.example`: ya tenía `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` vacíos desde HT-09; se agrega `APP_FRONTEND_URL`.

### Capas

- **`UserRepository.findByGoogleId(String googleId)`** (nuevo).
- **`User`**: se agrega el método estático `User.fromGoogle(email, googleId, firstName, lastName)` (cuenta nueva: sin `password_hash`, sin `phone`, `role=CLIENTE`, `email_verified=true` — a diferencia de `register()`, que la deja en `false`) y el método `linkGoogleAccount(String googleId)` (vincula una cuenta ya existente de HU-01).
- **`AuthService.loginWithGoogle(googleId, email, firstName, lastName, userAgent)`**:
  1. Busca por `googleId`. Si existe, es la cuenta a usar.
  2. Si no, busca por `email`. Si existe (cuenta de HU-01 sin vincular), llama `user.linkGoogleAccount(googleId)` y la guarda.
  3. Si tampoco existe por correo, crea la cuenta con `User.fromGoogle(...)`.
  4. Si la cuenta encontrada (por cualquiera de las dos vías) tiene `is_active = false`, lanza `InvalidCredentialsException` (la misma excepción y mensaje de HU-02 — no hace falta una nueva).
  5. Genera JWT + refresh token igual que `register`/`login` (reusa `createRefreshToken`, ya privado en `AuthService`).
- **`SessionCookieFactory`** (nuevo, `common/security/`): extrae la construcción de las dos cookies (`access_token`/`refresh_token`) que hoy vive en `AuthController.withSessionCookies`, para que `OAuth2SuccessHandler` la reuse sin duplicar los atributos (`httpOnly`/`Secure`/`SameSite=Strict`/`maxAge`). `AuthController` pasa a usar esta clase también.
- **`OAuth2SuccessHandler`** (nuevo, `common/security/`, implementa `AuthenticationSuccessHandler`): lee `sub`/`email`/`given_name`/`family_name` del `OAuth2User`, llama a `authService.loginWithGoogle(...)`, pone las cookies con `SessionCookieFactory` y redirige a `{app.frontend-url}/`. Si `loginWithGoogle` lanza `InvalidCredentialsException` (cuenta inactiva), redirige a `{app.frontend-url}/iniciar-sesion?error=google` sin poner cookies.
- **`OAuth2FailureHandler`** (nuevo, `common/security/`): `SimpleUrlAuthenticationFailureHandler` con `defaultFailureUrl = {app.frontend-url}/iniciar-sesion?error=google` — cubre que la persona cancele o rechace el acceso en Google.
- **`SecurityConfig`**: agrega `.oauth2Login(oauth2 -> oauth2.successHandler(...).failureHandler(...))` a la cadena ya existente.

### Caso borde: nombre faltante en el perfil de Google

`given_name`/`family_name` casi siempre vienen con el scope `profile`, pero si faltaran, `first_name`/`last_name` son `NOT NULL` en la tabla `users`. Si `given_name` es nulo, se usa el `name` completo como `firstName` y `""` como `lastName` (nunca `null`). No es un criterio de la spec, es solo para no romper la restricción de la base de datos ante un perfil de Google atípico.

## Frontend

- **`GoogleLoginButton`** (nuevo, `src/features/auth/`): no es una llamada de axios — es un enlace (`<a>`) a `{origen del backend}/oauth2/authorization/google` (navegación completa de página, no `fetch`). El "origen del backend" se deriva quitándole `/api` a `VITE_API_URL`, porque las rutas de OAuth2 de Spring Security no están bajo el prefijo `/api` de nuestros propios controladores.
- Se agrega en `RegisterPage` y `LoginPage` (mismo componente en los dos, como pide la spec).
- **`LoginPage`**: lee `?error=google` de la URL (`useSearchParams`) y, si está presente, llama `setError('root', { message: 'No pudimos iniciar sesión con Google. Intenta de nuevo.' })` al montar — reusa el mismo bloque de error de formulario que ya existe para el 401/429 de HU-02, no uno nuevo.
- La redirección de fallo siempre cae en `/iniciar-sesion` (nunca en `/registro`), aunque la persona haya iniciado el flujo desde el botón de `/registro`. Es una simplificación a propósito: el backend no sabe desde qué pantalla se inició el flujo, y no vale la pena una historia completa solo para preservarlo.

## Seguridad

- El `client-secret` de Google nunca llega al frontend: todo el intercambio código↔token ocurre servidor a servidor (así funciona `spring-boot-starter-security-oauth2-client`).
- Las cookies que emite `OAuth2SuccessHandler` son exactamente las mismas que las de `register`/`login` (mismo `SessionCookieFactory`): ningún atributo de seguridad queda más débil por venir de este flujo.
- Vincular una cuenta de HU-01 a Google por coincidencia de correo asume que Google ya verificó ese correo (lo cual es cierto: Google no deja iniciar sesión con un correo no verificado) — por eso es seguro vincular sin pedir la contraseña actual.

## Decisiones

- `SessionCookieFactory` como clase nueva: sin esto, `OAuth2SuccessHandler` tendría que duplicar los atributos de las cookies que ya están en `AuthController`. Se aprovecha para que `AuthController` también la use.
- `loginWithGoogle` reutiliza `InvalidCredentialsException` de HU-02 para la cuenta inactiva, en vez de una excepción nueva: el mensaje y el código HTTP ya son los correctos para "no se puede iniciar sesión con esta cuenta".
- `User.fromGoogle(...)` como método estático (no un constructor sobrecargado): un constructor con cinco o seis `String` seguidos, con significados distintos según cuál se use, es fácil de confundir en el sitio de la llamada.
- El botón de Google es el mismo componente en `/registro` y `/iniciar-sesion`, y el error siempre vuelve a `/iniciar-sesion`: la spec pide que sea "una sola acción", así que un solo punto de fallo es consistente con eso.

## Verificación (límites de lo que se puede automatizar)

- Backend: tests unitarios de `AuthService.loginWithGoogle` (Mockito) cubriendo los cuatro casos (cuenta nueva, cuenta existente por `googleId`, vínculo de una cuenta de HU-01 por correo, cuenta inactiva). Tests unitarios de `OAuth2SuccessHandler`/`OAuth2FailureHandler` con un `Authentication`/`OAuth2User` simulado, verificando las cookies y el `Location` de la redirección — no un `AuthControllerIT` con MockMvc, porque simular el intercambio completo con Google ahí sería frágil y de poco valor.
- Frontend: tests de que el botón apunta a la URL esperada y de que `LoginPage` muestra el error cuando `?error=google` está presente.
- **Lo que no se puede probar en este entorno**: el flujo real completo (hacer clic, aprobar en la pantalla real de Google, volver con la sesión creada) necesita un navegador real y tu cuenta de Google — queda como prueba manual tuya al final, igual que ya se señaló en `spec.md`.

## Impacto en docs/

Ninguno: `google_id` ya existe en `users` desde HT-06, y Google OAuth 2.0 ya está en `docs/diagrama-de-arquitectura.md` como servicio externo.
