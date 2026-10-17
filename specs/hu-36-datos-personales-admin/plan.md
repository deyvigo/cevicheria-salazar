# Plan: HU-36 — Ver y editar mis datos personales (Administrador)

`spec.md` en estado Clarificada. Reutiliza lo construido en HU-23 ([`plan.md`](../hu-23-datos-personales/plan.md)); aquí solo se listan los cambios.

## Backend

### Endpoints

Sin endpoints nuevos: el Administrador usa `PUT /api/perfil` y `PUT /api/perfil/contrasena`. Las reglas no cambian (validaciones, contador de intentos por usuario, cierre de las otras sesiones, usuario tomado de la sesión).

### Capas

- **`perfil/ProfileService`**: `loadCustomer` pasa a `loadUser`; sigue exigiendo usuario activo (si no, `401`) pero ya no rechaza el rol `ADMINISTRADOR` (se elimina el `AccessDeniedException` y su import).
- **`/api/admin/**`**: sin cambios. Estos endpoints no cuelgan de `/api/admin`, así que `AdminAccessInterceptor` no interviene; la autorización es "cualquier usuario activo con sesión", y el usuario modificado es siempre el de la sesión.

### Base de datos

Sin migraciones. El administrador por defecto (HT-11) puede tener `phone = null`; el diálogo lo muestra como "No registrado" y lo exige al guardar, igual que en una cuenta de Google.

## Frontend

### Rutas (`router.tsx`)

Dentro de la rama `/admin` existente (`AdminGuard` → `AdminLayout`), una ruta más:

```
/admin
  platos | categorias | pedidos | reportes   AdminSectionPage (HU-28)
  mi-informacion                             MyInformationPage   (la de HU-23)
  *                                          AdminNotFound
```

### Cambios

- **`features/admin/admin-sections.ts`**: se agrega `ADMIN_ACCOUNT_SECTION = { path: 'mi-informacion', label: 'Mi información' }` aparte de `ADMIN_SECTIONS` (que sigue con las cuatro secciones de gestión, de modo que el `index` sigue redirigiendo a `/admin/platos` y el router no les pone estado vacío a ésta).
- **`features/admin/components/admin-nav.tsx`**: dentro del mismo `<ul>`, después de las cuatro secciones, un ítem más para `ADMIN_ACCOUNT_SECTION` con ícono de persona (el mismo SVG de `profile-nav`, extraído a una constante compartida para no duplicarlo) y los mismos estilos, plegado incluido. "Cerrar sesión" no se mueve: sigue con `mt-auto` al fondo, separado de la lista.
- **`router.tsx`**: se registra `mi-informacion` con `MyInformationPage`.
- **`features/perfil/my-information-page.tsx`** y los diálogos: **sin cambios**; ya leen el usuario de `useAuth()` y no dependen del marco. Dentro del panel la página queda en `<main className="p-6">` de `AdminLayout`.
- **`lib/api.ts`**: el manejo de sesión vencida y de `403` que hoy aplica solo a `/admin/...` se extiende a las peticiones a `/perfil` **cuando el usuario en caché es administrador** (nuevo helper `isAdminSessionRequest(url)`), para que una sesión vencida o una cuenta desactivada en esta sección saque al administrador del panel como en las demás. Para un Cliente nada cambia.
- **`components/header.tsx`** y **`features/perfil/profile-guard.tsx`**: sin cambios (el Administrador ya no ve "Mi perfil" y `/perfil` ya le da 404).

### Documentación y specs

- **`specs/hu-23-datos-personales/spec.md`**: ajustado (el Administrador ya no recibe `403` de la API; reutiliza pantalla y API desde su panel, HU-36). Sus tests de backend se actualizan en este cambio.
- **`docs/cronograma.md`**: HU-36 agregada al final del Sprint 1 (tabla, semana 3 y entregables).

## Seguridad

- El usuario se toma del JWT, nunca del cuerpo: un administrador solo modifica su propia cuenta.
- Quitar la restricción de rol no abre nada nuevo: los endpoints ya eran de "usuario con sesión". Un visitante sigue recibiendo `401`.
- Se conservan el contador de intentos por usuario y el cierre de las otras sesiones; el administrador deja de depender de la contraseña inicial del `application.yml`.
- El guard del panel sigue siendo solo UX; el servidor valida la sesión y que la cuenta esté activa en cada petición.

## Decisiones

- **Mismos endpoints y misma página**: duplicar reglas o pantallas crearía dos formas de cambiar la misma contraseña y dos lugares que mantener.
- **Sección de cuenta aparte de `ADMIN_SECTIONS`**: evita que el router le asigne una pantalla vacía y mantiene la lista de gestión limpia; en la barra se renderiza como el último ítem de la lista.
- **Helper por rol en `lib/api.ts`** en vez de tratar todo `/perfil` como del panel: así el comportamiento del Cliente no cambia (su guard no está pensado para un vaciado de sesión desde el interceptor).

## Impacto en docs/

- `docs/historias.md`, `docs/epicas.md` y `docs/cronograma.md`: ya actualizados (HU-36).
- `docs/diagrama-de-casos-de-uso.md` (y su imagen): el caso "Gestionar perfil" pasa a ser también del Administrador; se actualiza al cerrar la historia.
- Arquitectura, despliegue y base de datos: sin cambios.
