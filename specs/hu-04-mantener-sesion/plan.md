# Plan: HU-04 — Mantener la sesión iniciada

`spec.md` en estado Clarificada.

## Backend

### Endpoints nuevos (mismo `AuthController`)

- **`GET /api/auth/me`**: `200` + `UserResponse` si hay un `access_token` válido; `401` si no (reusa el `@ExceptionHandler(AuthenticationException.class)` que ya existe en `ApiExceptionHandler` desde HT-09 — su mensaje, "Debes iniciar sesión para continuar.", ya es el correcto para este caso).
- **`POST /api/auth/refresh`**: lee la cookie `refresh_token`, la rota (revoca la vieja, emite access+refresh nuevos) y pone las mismas cookies que `register`/`login`/`loginWithGoogle`. `401` con un mensaje propio si el token no existe, ya fue usado, expiró, o el usuario ya no está activo.

### Capas

- **`JwtService.parse(String token) -> Optional<Claims>`** (nuevo): valida firma y expiración; `Optional.empty()` ante cualquier `JwtException` (token manipulado, vencido, mal formado) — nunca propaga la excepción de JJWT hacia arriba.
- **`JwtAuthFilter`** (nuevo, `common/security/`, `OncePerRequestFilter`): lee la cookie `access_token` (vía el lector de cookies de `SessionCookieFactory`, ver abajo); si `JwtService.parse(...)` devuelve algo, construye un `UsernamePasswordAuthenticationToken` (principal = `userId`, autoridad = `ROLE_<role>` del claim) y lo pone en el `SecurityContextHolder`. Si no hay cookie o es inválida, no hace nada — sigue la cadena como anónimo (igual que hoy). **No bloquea nada**: `SecurityConfig` sigue con `anyRequest().permitAll()`; este filtro solo hace que la petición *sepa* quién es, no decide quién puede entrar (eso es alcance de otra historia).
- **`SessionCookieFactory`**: se le agrega `readCookie(HttpServletRequest, String nombre) -> Optional<String>` (estático), para que `JwtAuthFilter` y `AuthController.refresh` no dupliquen la lectura de cookies — ya tenía los nombres (`ACCESS_TOKEN_COOKIE`/`REFRESH_TOKEN_COOKIE`) como constantes públicas.
- **`RefreshTokenRepository.findByTokenHash(String tokenHash)`** (nuevo).
- **`RefreshToken.revoke()`** (nuevo, paquete, análogo a `deactivate()` de `User`): pone `revoked_at = now()`.
- **`AuthService.refresh(rawRefreshToken, userAgent)`**:
  1. Hashea el token, busca por `tokenHash`.
  2. Si no existe, ya tiene `revoked_at`, o `expires_at` ya pasó → `SessionExpiredException`.
  3. Si el usuario de esa fila ya no existe o no está activo → misma excepción (una cuenta desactivada no debería poder seguir renovando su sesión).
  4. Si todo es válido: revoca la fila encontrada, genera un JWT y un refresh token nuevos (reusa el `createRefreshToken` privado que ya existe), y devuelve `AuthResult`.
- **`AuthService.getCurrentUser(Long userId)`** (nuevo, usado por `/me`): busca por id; si no existe, lanza `InsufficientAuthenticationException` (de Spring Security — la recoge el mismo handler genérico de `AuthenticationException`).

### Error nuevo (`common/exception`)

- **`SessionExpiredException`** → `401`, mensaje **"Tu sesión expiró. Inicia sesión de nuevo."** — distinto del de `InvalidCredentialsException` (ese es para cuando *nunca* hubo sesión válida; este es para cuando *había una* y dejó de serlo). Su `@ExceptionHandler` se agrega a `ApiExceptionHandler`, mismo patrón que los anteriores.

### `SecurityConfig`

Se agrega `JwtAuthFilter` con `.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)` (la clase se usa solo como referencia de posición; no usamos login por formulario). El resto de la cadena no cambia.

## Frontend

- **`authApi.me()`** (nuevo, junto a `register`/`login`): `GET /auth/me`.
- **`AuthContext`**: `AuthProvider` agrega un `useEffect` al montar que llama `me()`; si resuelve, `setUser(...)`; si falla (401, incluso después de que el interceptor ya intentó refrescar), `setUser(null)`. Se agrega `isLoading` al contexto (`true` hasta que esa llamada termine), para que pantallas futuras puedan esperar a saber si hay sesión antes de decidir qué mostrar — hoy ninguna pantalla lo necesita todavía, pero sin esto cualquier futura ruta protegida tendría un parpadeo "no hay sesión" antes de confirmar que sí la hay.
- **`lib/api.ts`**: interceptor de respuesta de axios. Ante cualquier `401` que no venga de `/auth/login`, `/auth/register` o `/auth/refresh` (para no entrar en bucle ni reintentar un login que genuinamente falló), intenta `api.post('/auth/refresh')` una vez; si funciona, reintenta la petición original; si falla, propaga el error original. Esto cubre tanto el bootstrap (`/me` al abrir la app) como cualquier llamada futura de otra épica, sin que cada feature tenga que manejarlo por su cuenta.

## Seguridad

- Rotar el refresh token en cada uso (y revocar el anterior) significa que un `refresh_token` nunca sirve dos veces: si alguien lo copia y lo usa después de que el dueño ya lo usó, su intento falla con `SessionExpiredException` (no distingue "vencido" de "reusado" en la respuesta — mismo mensaje, por las mismas razones de no filtrar información de HU-02/HU-06).
- `JwtAuthFilter` nunca confía en los claims del JWT para nada más que identificar el `userId`; `/me` y `/refresh` siempre vuelven a consultar `UserRepository` para los datos reales (`is_active`, rol actual, etc.), así una cuenta desactivada después de emitido el JWT no sigue "funcionando" hasta que el token expire por sí solo en el peor caso de `/refresh` (en `/me` sí podría, hasta 15 minutos — ver Decisiones).

## Decisiones

- `/me` no revalida `is_active` contra la base en este momento (solo `/refresh` lo hace): la ventana de exposición es como máximo los 15 minutos de vida del `access_token`, y añadir esa consulta a cada `/me` no cambia el peor caso real, solo lo acerca un poco — no es parte de los criterios de esta historia (desactivar cuentas no es una funcionalidad que exista todavía).
- `JwtAuthFilter` no bloquea nada (no hay `authenticated()` en ninguna ruta): separar "saber quién eres" de "qué puedes hacer" deja la puerta abierta para que una historia futura agregue autorización por rol sin tocar este filtro.
- El refresco se maneja con un interceptor de axios, no con un timer en segundo plano: no hay que despertar la pestaña inactiva para renovar algo que nadie está usando; se renueva cuando realmente hace falta.
- No se construye un test de frontend para el interceptor de axios en sí (es frágil de simular bien con mocks); se verifica con una prueba manual real por HTTP (igual que en HU-01/02/06) y con el test de `AuthContext`/bootstrap, que sí es value real de comportamiento de React.

## Impacto en docs/

Ninguno: no hay cambios de arquitectura ni de modelo de datos — `refresh_tokens.revoked_at`/`expires_at` ya estaban en `docs/diagrama-de-base-de-datos.md` desde HT-06, simplemente no se habían usado todavía.
