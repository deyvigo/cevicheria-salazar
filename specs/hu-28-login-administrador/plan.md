# Plan: HU-28 — Iniciar sesión como administrador y acceder al panel

`spec.md` en estado Clarificada.

## Backend

### Endpoints

Esta historia no agrega endpoints de negocio (los del panel llegan con HU-29 a HU-34); deja lista la **regla de acceso** para todo lo que cuelgue de `/api/admin/**`:

- Sin sesión: `401` ("No autenticado").
- Sesión de Cliente (o administrador desactivado): `403` ("Prohibido").
- Administrador activo: pasa.

El login (`POST /api/auth/login`) y `GET /api/auth/me` ya devuelven `role`; no cambian.

### Capas

- **`admin/AdminAccessInterceptor`** (nuevo, `HandlerInterceptor`): se aplica a `/api/admin/**`. Lee el `userId` del `Authentication` que deja `JwtAuthFilter`; si no hay, lanza `InsufficientAuthenticationException` (ya mapeada a `401` por `ApiExceptionHandler`). Si hay, consulta `UserRepository.findById` y exige `role == ADMINISTRADOR` e `isActive`; si no, lanza `AdminAccessDeniedException`.
- **`admin/AdminWebConfig`** (nuevo, `WebMvcConfigurer`): registra el interceptor para `/api/admin/**`.
- **Denegación**: el interceptor lanza `org.springframework.security.access.AccessDeniedException`, que `ApiExceptionHandler` ya traduce a `403` ("Prohibido"); no hace falta una excepción propia.
- **`SecurityConfig` / `JwtAuthFilter`**: sin cambios.

### Base de datos

Sin migraciones: `users.role` e `is_active` ya existen (HT-11).

## Frontend

### Rutas (`router.tsx`)

Nueva rama **hermana** del `Layout` de la tienda, para que el header superior no exista en el panel:

```
/admin                      AdminGuard → AdminLayout
  index                     <Navigate to="/admin/platos" replace />
  platos | categorias |
  pedidos | reportes        AdminSectionPage (estado vacío por sección)
  *                         AdminNotFound (dentro del panel, con la navegación)
```

### Pantallas y componentes (`src/features/admin/`)

- **`admin-guard.tsx`**: lee `useAuth()`.
  - `isLoading`: no renderiza nada (evita el parpadeo del 404).
  - Administrador: `<Outlet />`.
  - Cualquier otro (visitante o cliente): renderiza `components/not-found.tsx`, un 404 mínimo ("Página no encontrada") en el mismo lugar, sin redirigir al login. Un `throw new Response(...)` dentro de un componente no lo trata el router como 404 (muestra "Unexpected Application Error"), por eso se renderiza un componente. La página 404 definitiva y su uso como `errorElement` serán otra historia, que reemplazará este componente.
  - Si el usuario pasa de administrador a sin sesión mientras el panel está abierto (sesión vencida o cuenta desactivada), redirige a `/iniciar-sesion`. Un ref `leavingRef` distingue ese caso del cierre de sesión voluntario, que el guard expone a sus hijos con un contexto mínimo (`useAdminSession().signOut()`).
- **`admin-layout.tsx`**: pantalla completa en dos columnas, `AdminNav` a la izquierda, a toda la altura (`w-64`, o `w-16` plegada) y `<main>` con `<Outlet />` a la derecha. Sin `Header`. El aviso "Cerraste sesión" lo muestra el `Layout` de la tienda, adonde lleva el cierre.
- **`components/admin-nav.tsx`**: `<aside>` a toda la altura (`sticky top-0 h-svh`, `border-r border-border bg-surface`) con, de arriba abajo: cabecera con el título "Administrador" (`font-display`) y a la derecha un botón con ícono de ventana (`aria-label` "Contraer menú"/"Expandir menú", `aria-expanded`) que alterna el estado local `collapsed`; `<nav aria-label="Panel de administración">` con las cuatro secciones (`NavLink`, `aria-current="page"`, ítems `min-h-12 rounded-md`, activo `bg-action-secondary font-bold`, hover `bg-surface-celeste`); y al final (`mt-auto`) el botón "Cerrar sesión" (`signOut()`). Plegada (`w-16`): sin título y con las etiquetas solo para lectores (`sr-only`) y `title`, quedando los íconos SVG en línea de cada ítem. Si el cierre falla, `Notification` de error como en `Header` (sesión intacta). Sin enlace "Ir a la tienda".
- **`components/admin-section-page.tsx`**: título de la sección y estado vacío ("Aún no hay nada por mostrar."), sin datos simulados. HU-29 a HU-34 reemplazan cada ruta por su pantalla real.
- **`admin-not-found.tsx`**: "Página no encontrada" dentro del panel.
- Design system: estilos de ítem de `CategoryList` y `Notification`. Sin tokens nuevos. Los íconos son SVG en línea (no hay íconos de navegación en `design-system/assets/`).

### Login y retorno

- **`login-page.tsx`**: `onSubmit` usa el usuario que devuelve `mutateAsync`; si `role === 'ADMINISTRADOR'`, `navigate('/admin', { replace: true })` ignorando `returnPath`; si no, igual que hoy.
- **`return-path.ts`**: `safeReturnPath` rechaza rutas `/admin` y `/admin/...` (ni el login de Google ni un `from` manipulado pueden mandar a un Cliente al panel).
- **`header.tsx`**: si `user.role === 'ADMINISTRADOR'`, el menú de cuenta agrega, antes de "Cerrar sesión", un `Link` con `role="menuitem"` "Panel de administración" a `/admin`.
- **`features/auth/me-query-key.ts`** (nuevo): `ME_QUERY_KEY` sale de `auth-api.ts` para que `lib/api.ts` pueda usarla sin import circular.
- **`lib/api.ts`**: para peticiones a `/admin/...`, si falla la renovación tras un `401`, se pone `ME_QUERY_KEY` en `null`; un `403` invalida `ME_QUERY_KEY`. Así el guard reacciona a la sesión vencida o al cambio de rol sin recargar. Las demás rutas no cambian.

## Seguridad

- La protección real es la del servidor: el interceptor revalida **rol y estado activo en la base de datos en cada petición** a `/api/admin/**`, no solo el claim `role` del JWT (que puede durar hasta 15 min tras un cambio de rol o una desactivación).
- El guard del frontend es solo UX. Ocultar la ruta no es seguridad; cada endpoint de HU-29 a HU-34 queda protegido por el interceptor sin trabajo adicional.
- No hay login distinto para administradores: mismo endpoint, mismo mensaje genérico y mismo límite de intentos (HU-02), así que no se revela qué cuentas son de administrador.
- Los clientes, incluidos los de Google (siempre `CLIENTE`), no pueden llegar al panel.

## Decisiones

- **404 renderizado en el guard, sin redirigir**: no filtra que `/admin` existe. Se usa un `NotFound` mínimo que la historia de la página 404 reemplazará.
- **El rol manda sobre la ruta de retorno** al iniciar sesión; para no mezclar, las rutas `/admin` se excluyen de las rutas de retorno.
- **Interceptor en `admin/` y no regla en `SecurityConfig`**: con `oauth2Login` configurado, una regla `hasRole` sin sesión redirige (302) hacia Google en lugar de responder `401`, y además solo vería el rol del JWT, no la base de datos.
- **Rutas hermanas, no anidadas en `Layout`**: es la forma de que `/admin` no herede el header sin condicionales dentro de `Header`.
- **Solo escritorio**: el panel no se diseña para móvil (spec).

## Impacto en docs/

- `docs/cronograma.md`: marcar HU-28 como hecha al cerrar.
- Arquitectura, casos de uso y base de datos ya describen el acceso por rol a `/admin`; no requieren cambios.
