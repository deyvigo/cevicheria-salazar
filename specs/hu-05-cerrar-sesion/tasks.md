# Tareas: HU-05 — Cerrar sesión

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: cookies

- [x] Agregar `SessionCookieFactory.clearAccessTokenCookie()` y `clearRefreshTokenCookie()` (mismos atributos que las cookies originales, `maxAge` cero) — cubre: quedar como Visitante, otras pestañas del mismo navegador — verificación: test unitario — ambas cookies tienen `Max-Age=0`, valor vacío y los mismos `HttpOnly`, `Secure`, `SameSite=Strict` y `Path=/` que las de sesión.

## Backend: servicio

- [x] Implementar `AuthService.logout(String rawRefreshToken)`: busca por `tokenHash` y revoca la fila si existe y `revokedAt == null`; en cualquier otro caso no hace nada — cubre: `refresh_token` invalidado en el servidor, cerrar con sesión ya vencida o cerrada, un solo dispositivo — verificación: `AuthServiceTest` — token válido queda con `revokedAt`; token desconocido y token ya revocado no lanzan excepción y no cambian el `revokedAt` original; no se tocan otras filas del mismo usuario.

## Backend: endpoint

- [x] Implementar `AuthController.logout()` (`POST /api/auth/logout`): lee la cookie `refresh_token` si existe, llama `authService.logout` y responde `204` con las dos cookies expiradas — cubre: todos los criterios de backend — verificación: `AuthControllerIT` — login real → `logout` con esas cookies da `204` con `Set-Cookie` de borrado; después `POST /refresh` con ese mismo refresh token da `401`; `logout` sin cookies da `204`; `logout` repetido con el mismo token da `204`; con dos logins del mismo usuario, cerrar uno no impide que el otro refresque.

## Frontend: cliente y componentes base

- [x] Agregar `authApi.logout()` y agregar `/auth/logout` a `NO_REFRESH_PATHS` en `lib/api.ts` — cubre: llamada real al backend sin bucle de renovación — verificación: usado por `Header` y su test; el interceptor se verifica en la prueba manual (sin test propio, igual que HU-04).
- [x] Agregar la variante `error` a `Notification` (copiar `notif-error.svg` a `frontend/public/icons/`) — cubre: mensaje cuando el cierre falla — verificación: usado por `Header` y su test.

## Frontend: header

- [x] Crear `Header` (`src/components/Header.tsx`): sin sesión, botón "Iniciar sesión" a `/iniciar-sesion`; con sesión, botón con el nombre que abre un menú con "Cerrar sesión" (cierra con clic fuera, `Escape` y al elegir); mientras `isLoading`, no muestra ninguno — cubre: criterio del header — verificación: test de componente (`Header.test.tsx`) con `AuthContext` simulado — sin sesión muestra el enlace y no el nombre; con sesión muestra el nombre y no el enlace; clic en el nombre abre el menú; `Escape` lo cierra y devuelve el foco al botón; con `isLoading` no muestra ninguno.
- [x] Flujo de cierre en `Header`: llama `authApi.logout()`; si resuelve, `setUser(null)` y `navigate('/', { state: { loggedOut: true } })`; si falla, conserva la sesión y muestra el toast de error "No pudimos cerrar tu sesión, intenta de nuevo" — cubre: quedar como Visitante, fallo del servidor — verificación: `Header.test.tsx` — logout resuelto limpia el usuario y navega a `/`; logout rechazado no limpia el usuario y muestra el error.
- [x] Crear `Layout` (`Header` + `<Outlet />`) y reorganizar `router.tsx`: `/` pasa a ser hija de `Layout`; `/registro` y `/iniciar-sesion` quedan fuera — cubre: header visible en la tienda — verificación: revisión manual en navegador (ver abajo).
- [x] Toast "Cerraste sesión" en la página de inicio: si `location.state.loggedOut`, muestra un `Notification` de éxito (se cierra a los 4 s o con ✕) y limpia el estado con `replace` para que recargar no lo repita — cubre: confirmación al cerrar sesión — verificación: test de la página de inicio con `MemoryRouter` y `state: { loggedOut: true }` — se muestra el toast; sin ese estado no se muestra.

## Verificación cruzada

- [x] Prueba manual end-to-end real por HTTP (backend + Postgres/Redis reales): login → `GET /me` `200` → `POST /logout` `204` con cookies expiradas → `POST /refresh` con el refresh token viejo `401` → segundo `POST /logout` `204`; con dos logins del mismo usuario, cerrar uno no afecta al otro — cubre: criterios de backend.
- [x] Prueba en navegador (`./scripts/dev.sh`): sin sesión el header muestra "Iniciar sesión"; tras iniciar sesión muestra el nombre y el desplegable; "Cerrar sesión" lleva a `/` con el toast; recargar y reabrir el navegador sigue como Visitante; con dos pestañas, la otra queda deslogueada en su siguiente llamada; con el backend apagado muestra el error y conserva el nombre — cubre: criterios de frontend.
- [x] Antes de commitear: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`.
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final y marcar la spec como **Hecha**.
