# Plan: HU-05 — Cerrar sesión

`spec.md` en estado Clarificada.

## Backend

### Endpoint nuevo (mismo `AuthController`)

- **`POST /api/auth/logout`**: sin body. Lee la cookie `refresh_token` (si existe), revoca esa sesión y responde `204` con las dos cookies de sesión expiradas (`Max-Age=0`). No exige autenticación e **siempre** responde `204`: sin cookie, con un token desconocido, ya revocado o ya vencido, el resultado es el mismo (idempotente).

### Capas

- **`SessionCookieFactory`**: se agregan `clearAccessTokenCookie()` y `clearRefreshTokenCookie()`. Reusan el mismo helper privado `cookie(...)` con valor vacío y `maxAge` en cero, para que `httpOnly`, `secure`, `SameSite=Strict` y `path=/` coincidan con los de la cookie original (si algún atributo difiere, el navegador no la reemplaza y la cookie sigue viva).
- **`AuthService.logout(String rawRefreshToken)`** (nuevo, `@Transactional`): hashea el token, `findByTokenHash`, y si la fila existe y `revokedAt == null`, llama `revoke()`. Si no existe o ya estaba revocada, no hace nada ni lanza excepción. No se filtra por `expiresAt`: revocar una fila ya vencida es inofensivo.
- **`RefreshToken.revoke()`**: ya existe (HU-04), se reusa sin cambios. Solo se llama si `revokedAt == null`, así se conserva la fecha original del primer cierre.
- **`JwtAuthFilter` / `JwtService` / `SecurityConfig`**: sin cambios. El `access_token` no se revoca (ver spec): se borra su cookie y vence solo.

### Base de datos

Sin migraciones. `refresh_tokens.revoked_at` ya existe (HT-06) y ya se usa para la rotación de HU-04; ahora también marca el cierre manual, tal como describe `docs/diagrama-de-base-de-datos.md`.

## Frontend

### Pantallas y componentes

- **`Layout`** (`src/components/Layout.tsx`, nuevo): renderiza `Header` y un `<Outlet />`. En `router.tsx`, `/` pasa a ser hija de este layout (hoy `App`). `/registro` y `/iniciar-sesion` quedan fuera: son pantallas de formulario sin header.
- **`Header`** (`src/components/Header.tsx`, nuevo): barra básica con el nombre "Salazar SAC" a la izquierda y, a la derecha, el estado de sesión leído de `useAuth()`:
  - `isLoading`: no muestra ni el botón ni el nombre (evita el parpadeo "Iniciar sesión" → nombre al abrir la app).
  - Sin sesión: `Button` (variante `secondary`) "Iniciar sesión", enlace a `/iniciar-sesion`.
  - Con sesión: botón con `user.firstName` que abre un menú desplegable con la opción "Cerrar sesión". Se cierra con clic fuera, con `Escape` y tras elegir la opción. Accesible: `aria-haspopup="menu"`, `aria-expanded`, el menú con `role="menu"` y el ítem con `role="menuitem"`; el foco vuelve al botón al cerrarse con `Escape`.
  - El menú no existe en `design-system/components/`: se construye con los tokens existentes (`bg-surface`, `border`, `rounded-lg`, `shadow-md`, `text-ink`), sin colores ni sombras inventados. Si más adelante se necesita en otras pantallas, se promueve a componente del design system.
- **Cerrar sesión (flujo)**: `Header` llama `authApi.logout()`. Si resuelve, `setUser(null)` y `navigate('/', { state: { loggedOut: true } })`. Si falla (red caída o `5xx`), no toca el estado de sesión y muestra un toast de error con el texto "No pudimos cerrar tu sesión, intenta de nuevo". Un `401` no ocurre porque el endpoint no exige autenticación; de ocurrir, se trataría como éxito.
- **Toast "Cerraste sesión"**: la página de inicio lee `location.state.loggedOut` y muestra un `Notification` de éxito ("Cerraste sesión") que se cierra solo a los 4 s o con la ✕. El estado de navegación se limpia con `navigate('/', { replace: true, state: null })` al mostrarlo, para que un refresco no repita el toast.
- **`Notification`**: se agrega la variante `error` (`bg-error-surface`, borde `coral-300`, ícono `notif-error.svg` copiado de `design-system/assets/Notificaciones/` a `frontend/public/icons/`). Por README del design system, el error permanece hasta cerrarse (no tiene temporizador).
- **`authApi.logout()`** (nuevo): `POST /auth/logout`.
- **`lib/api.ts`**: `/auth/logout` se agrega a `NO_REFRESH_PATHS`, para que nunca intente renovar la sesión como respuesta a su propio fallo (evita resucitar la sesión que se está cerrando).

## Seguridad

- La revocación vive en PostgreSQL: después del cierre, ese `refresh_token` no puede renovarse aunque alguien lo haya copiado (`AuthService.refresh` ya rechaza las filas con `revokedAt`).
- **Riesgo aceptado (decidido en la clarificación)**: un `access_token` copiado antes del cierre sigue siendo válido hasta 15 minutos como máximo. Lo único que lo mitiga es que el navegador ya no lo envía.
- `POST /api/auth/logout` no exige autenticación y no tiene CSRF (deshabilitado en `SecurityConfig`). Un sitio de terceros podría provocar un cierre de sesión ajeno, pero las cookies son `SameSite=Strict`, así que el navegador no las envía en peticiones originadas desde otro sitio: el cierre forzado no llega a revocar nada.
- Las cookies se borran con los mismos atributos con los que se crearon (ver `SessionCookieFactory` arriba).
- Cerrar sesión no filtra información: la respuesta es idéntica exista o no el token.

## Decisiones

- **Solo la sesión actual**: se revoca la fila que corresponde al `refresh_token` de la cookie; las demás filas del usuario (otros dispositivos) no se tocan.
- **`204` siempre**: el endpoint no distingue sesión válida de inválida; simplifica el frontend (no hay caso de error que no sea de red) y no revela nada.
- **El cierre en el frontend espera la respuesta del servidor** (no es "optimista"): si el backend falla, no se muestra al usuario como deslogueado cuando su sesión sigue viva, que es justo lo que la historia quiere evitar en un dispositivo compartido.
- **`Layout` con `Outlet` solo para la tienda**: las páginas de login/registro no necesitan header, y las futuras pantallas de la tienda (catálogo, carrito) heredan el header agregando su ruta como hija del mismo layout.
- **Sin tests de interceptor**: igual que HU-04, `lib/api.ts` se verifica con la prueba manual end-to-end.

## Impacto en docs/

Ninguno: no hay cambios de arquitectura ni de modelo de datos. `docs/diagrama-de-base-de-datos.md` ya describía `revoked_at` como la marca de "cerrar sesión manualmente (HU-05)".
