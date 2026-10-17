# Tareas: HU-28 — Iniciar sesión como administrador y acceder al panel

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: regla de acceso

- [x] Reusar `AccessDeniedException` (ya mapeada a `403` en `ApiExceptionHandler`) en lugar de una excepción propia — cubre: protección por API — verificación: cubierto por el IT del interceptor.
- [x] Crear `AdminAccessInterceptor` y `AdminWebConfig` (`/api/admin/**`): `401` sin sesión, `403` si el usuario no es `ADMINISTRADOR` activo (consulta en base de datos) — cubre: protección por API, cuenta desactivada, cambio de rol con sesión viva — verificación: `AdminAccessInterceptorTest` (unitario con repositorio simulado): sin autenticación → `401`; cliente → denegado; administrador inactivo → denegado; administrador activo → pasa.
- [x] `AdminAccessIT` con un controlador de prueba en `src/test` bajo `/api/admin/_probe` — cubre: protección por API — verificación: sin cookies `401`; login de cliente `403`; login del administrador por defecto `200`; tras desactivar al administrador en base de datos con su access token aún vigente `403`; tras cambiar su rol a `CLIENTE` `403`.

## Frontend: login y retorno

- [x] `safeReturnPath` rechaza `/admin` y `/admin/...` — cubre: ruta de retorno de un Cliente nunca apunta a `/admin` — verificación: `return-path.test.ts` — `/admin`, `/admin/pedidos` y `/admin?x=1` devuelven `null`; `/adminx` (no es el panel) y `/menu` se conservan.
- [x] `login-page.tsx`: si el usuario devuelto es administrador, navegar a `/admin` ignorando `returnPath` — cubre: acceso del administrador, el rol manda sobre la ruta de retorno, el cliente no cambia — verificación: `login-page.test.tsx` — admin con `from: '/cart'` termina en `/admin`; cliente con `from: '/cart'` termina en `/cart`; cliente sin `from` en `/`.
- [x] `header.tsx`: opción "Panel de administración" (`Link`, `role="menuitem"`) solo para administradores — cubre: acceso desde la tienda — verificación: `header.test.tsx` — admin ve la opción y apunta a `/admin`; cliente no la ve.

## Frontend: panel

- [x] `admin-guard.tsx` — cubre: abrir `/admin` con sesión, 404 para no administradores, sesión vencida en el panel — verificación: `admin-guard.test.tsx` — con `isLoading` no renderiza nada; administrador ve el contenido; cliente y visitante ven el 404 (sin redirigir); si el usuario pasa de administrador a `null` redirige a `/iniciar-sesion`.
- [x] `components/admin-nav.tsx` — cubre: navegación vertical con cuatro secciones, estilo de ítem de `CategoryList`, barra a toda la altura con título "Administrador", plegado con botón de ventana, ítem activo con `aria-current` y "Cerrar sesión" al final — verificación: `admin-nav.test.tsx` — muestra las cuatro secciones con sus rutas; el ítem de la ruta actual tiene `aria-current="page"` y los demás no; el botón de plegado quita el título y conserva los ítems accesibles, y al expandir vuelve; no existe "Ir a la tienda"; "Cerrar sesión" llama `signOut`; si falla, muestra el error y no cambia la sesión.
- [x] `admin-layout.tsx`, `components/admin-section-page.tsx`, `admin-not-found.tsx` y rutas en `router.tsx` (rama hermana de `Layout`, `index` → `/admin/platos`, comodín dentro del panel) — cubre: sin header superior, sección inicial, URL por sección, estado vacío, sección inexistente — verificación: `admin-layout.test.tsx` con `MemoryRouter` — `/admin` redirige a `/admin/platos` con "Platos" activo; cambiar de sección cambia la URL y el contenido sin recargar; no hay `banner` (header) ni buscador; cada sección muestra su título y el estado vacío; `/admin/otra` muestra "Página no encontrada" con la navegación visible.
- [x] Cierre de sesión desde el panel (`signOut` del guard): marca la salida voluntaria, llama a `logout`, navega a `/` con `loggedOut` — cubre: cerrar sesión desde el panel — verificación: `admin-guard.test.tsx` — tras `signOut` se termina en `/` y no en `/iniciar-sesion`.
- [x] `lib/api.ts`: renovación fallida en `/admin/...` pone `ME_QUERY_KEY` en `null`; `403` la invalida — cubre: sesión vencida o cuenta desactivada en el panel — verificación: sin test propio del interceptor (igual que HU-04); prueba manual.

## Verificación cruzada

- [x] Prueba end-to-end por HTTP (backend + Postgres/Redis reales) con el administrador de `./scripts/dev.sh`: login `200` con `role: ADMINISTRADOR`; login de cliente; endpoint de prueba `/api/admin/...` con ambos — cubre: protección por API.
- [x] Prueba en navegador (`./scripts/dev.sh`): login como administrador lleva a `/admin/platos` aun viniendo de `/cart`; no hay header; navegación vertical y URL por sección; recargar en `/admin/pedidos` conserva sección y sesión; como cliente y sin sesión `/admin` y `/admin/pedidos` muestran el 404; el menú de cuenta de la tienda ofrece "Panel de administración" solo al administrador; "Cerrar sesión" funciona; la barra ocupa toda la altura y el plegado funciona — cubre: criterios de frontend.
- [x] Antes de commitear: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`.
- [x] Marcar HU-28 en `docs/cronograma.md`; recorrer cada criterio de `spec.md` contra la implementación y marcar la spec como **Hecha**.
