# Tareas: HU-04 — Mantener la sesión iniciada

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: utilidades compartidas

- [x] Agregar `SessionCookieFactory.readCookie(HttpServletRequest, String nombre) -> Optional<String>` (estático) — cubre: base para `JwtAuthFilter` y `AuthController.refresh` sin duplicar la lectura de cookies — verificación: usado por ambos, sin tests propios (es trivial).
- [x] Agregar `RefreshToken.revoke()` (paquete, pone `revoked_at`) y `RefreshTokenRepository.findByTokenHash(String)` — cubre: base para rotar el refresh token — verificación: usados por `AuthServiceTest`.

## Backend: validar el JWT

- [x] Agregar `JwtService.parse(String token) -> Optional<Claims>` — cubre: base de `JwtAuthFilter` — verificación: test unitario — token válido devuelve los claims; token firmado con otra clave o mal formado devuelve `Optional.empty()` (nunca propaga la excepción de JJWT).
- [x] Implementar `JwtAuthFilter` (`OncePerRequestFilter`, `common/security/`) y registrarlo en `SecurityConfig` con `addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)` — cubre: que `/me` pueda saber quién hizo la petición — verificación: test unitario con `MockHttpServletRequest`/`MockHttpServletResponse` — cookie con JWT válido puebla el `SecurityContextHolder`; sin cookie o con un JWT inválido, lo deja como estaba (limpiar el contexto en cada test para no contaminar otros).

## Backend: excepción nueva

- [x] Crear `SessionExpiredException` (`common/exception`) con su `@ExceptionHandler` en `ApiExceptionHandler` (`401`, "Tu sesión expiró. Inicia sesión de nuevo.") — cubre: mensaje al fallar `/refresh` — verificación: cubierto por `AuthControllerIT` (ver abajo); no se duplica en `ApiExceptionHandlerTest` porque ya prueba el patrón genérico con otras excepciones.

## Backend: servicio

- [x] Implementar `AuthService.refresh(rawRefreshToken, userAgent)`: busca por `tokenHash` → si no existe/revocado/vencido o el usuario ya no está activo, `SessionExpiredException` → si es válido, revoca la fila encontrada y genera JWT + refresh token nuevos — cubre: renovación automática, rotación, token reusado/vencido — verificación: `AuthServiceTest` — un caso por rama (token válido rota y devuelve tokens nuevos; token no encontrado, revocado, vencido, y usuario inactivo, los cuatro con el mismo error).
- [x] Implementar `AuthService.getCurrentUser(Long userId)` (usado por `/me`) — cubre: recuperar la sesión al abrir la app — verificación: `AuthServiceTest` (usuario existente devuelve su perfil; usuario inexistente lanza `InsufficientAuthenticationException`).

## Backend: endpoints

- [x] Implementar `AuthController.me()` (`GET /api/auth/me`, lee `Authentication`) y `AuthController.refresh()` (`POST /api/auth/refresh`, lee la cookie vía `SessionCookieFactory.readCookie`, pone las cookies nuevas con el mismo helper que `register`/`login`) — cubre: todos los criterios de backend — verificación: `AuthControllerIT` — login real → `/me` devuelve el perfil; sin cookie → `/me` da `401`; `/refresh` con el token de ese login da cookies nuevas y `200`; usar el refresh token **ya usado** una segunda vez da `401` con el mensaje de sesión expirada.

## Frontend: recuperar la sesión al abrir la app

- [x] Agregar `authApi.me()` — cubre: llamada real al backend — verificación: usado por `AuthContext` y su test.
- [x] `AuthContext`: `AuthProvider` llama `me()` al montar; agrega `isLoading` al contexto — cubre: "sigo adentro sin hacer nada" al abrir la app — verificación: test de `AuthContext`/`AuthProvider` mockeando `authApi.me` — resuelve con usuario → `user` queda seteado e `isLoading` en `false`; rechaza → `user` queda `null`.

## Frontend: renovación automática

- [x] Interceptor de respuesta en `lib/api.ts`: ante `401` que no sea de `/auth/login`, `/auth/register` o `/auth/refresh`, intenta `POST /auth/refresh` una vez y reintenta la petición original; si falla, propaga el error — cubre: renovación automática y silenciosa — verificación: sin test de frontend (ver Decisiones en `plan.md`); se verifica con la prueba manual end-to-end de abajo.

## Verificación cruzada

- [x] Prueba manual end-to-end real por HTTP (backend + Postgres/Redis reales, sin mocks): login → `GET /me` con la cookie → `200` con el perfil; `POST /refresh` → `200` con cookies nuevas; reusar el refresh token viejo → `401` con "Tu sesión expiró..."; `GET /me` sin ninguna cookie → `401` genérico — cubre: todos los criterios de `spec.md`.
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final (incluida la prueba manual anterior) y marcar la spec como **Hecha**.
