# Plan: HU-23 — Ver y editar mis datos personales

`spec.md` en estado Clarificada.

## Backend

### Endpoints (paquete `perfil`)

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `PUT /api/perfil` | `{ firstName, lastName, phone }` | `200` con `UserResponse` actualizado |
| `PUT /api/perfil/contrasena` | `{ currentPassword?, newPassword }` | `204` |

Reglas comunes: sin sesión `401`; administrador `403` (`AccessDeniedException`, ya mapeada). El usuario sale siempre del `Authentication` (`userId`), nunca del cuerpo. `GET /api/auth/me` ya devuelve los datos para mostrarlos, así que no se agrega un `GET`.

**`PUT /api/perfil`**
- Validación en `UpdateProfileRequest`: nombres y apellidos obligatorios (`@NotBlank`, `@Size(max = 80)`, por la columna `VARCHAR(80)`), teléfono obligatorio con `^9[0-9]{8}$` y el mismo mensaje de `RegisterRequest`. Se hace `trim` en el constructor compacto, como en `RegisterRequest`. El patrón del teléfono pasa a una constante compartida `PhoneRules` (junto a `PasswordRules`) para no duplicarlo.

**`PUT /api/perfil/contrasena`**
- `newPassword` con las reglas de `PasswordRules` (patrón y máximo 72).
- Si la cuenta tiene `passwordHash`: `currentPassword` es obligatoria; si no coincide, `400` con `fieldErrors` en `currentPassword` ("La contraseña actual no es correcta.") y se cuenta como intento fallido. Si `newPassword` coincide con la actual, `400` con `fieldErrors` en `newPassword` ("La nueva contraseña debe ser distinta de la actual.").
- Si la cuenta no tiene `passwordHash` (Google): se ignora `currentPassword` y se crea la contraseña.
- Con éxito: guarda el hash, limpia el contador de intentos y revoca todos los refresh tokens del usuario **excepto el de la sesión actual**.

### Capas

- **`perfil/ProfileController`** (nuevo): lee el `userId` del `Authentication` (mismo patrón que `AuthController.me`), lee la cookie `refresh_token` con `SessionCookieFactory.readCookie` para la contraseña (la cookie tiene `path=/`, así que llega a `/api/perfil`) y delega.
- **`perfil/ProfileService`** (nuevo, `@Transactional`): carga el `User`, exige `isActive` y rol `CLIENTE`, aplica los cambios y revoca las otras sesiones.
- **`perfil/PasswordChangeAttemptService`** (nuevo): igual que `LoginAttemptService` (3 intentos, 15 minutos, `StringRedisTemplate`) pero con clave `profile:password-attempts:{userId}`. Se consulta antes de verificar la contraseña actual (`TooManyAttemptsException` → `429`, ya mapeada).
- **`auth/User`**: `changePassword` pasa de package-private a `public` y se agrega `updateProfile(firstName, lastName, phone)` que también actualiza `updatedAt`.
- **`auth/RefreshTokenRepository`**: `revokeAllByUserIdExcept(userId, tokenHash)` (`update ... where userId = :userId and revokedAt is null and tokenHash <> :tokenHash`). Si la petición no trae cookie `refresh_token`, se usa `revokeAllByUserId`.
- **`auth/dto/UserResponse`**: agrega `hasPassword` (`passwordHash != null`) para que el frontend sepa si el diálogo es "Crear" o "Cambiar". No expone el hash.
- **`common/exception/FieldInvalidException`** (nuevo) + handler en `ApiExceptionHandler`: `400` con `fieldErrors` de un solo campo (existe `FieldConflictException`, pero devuelve `409`).
- **`SecurityConfig` / `JwtAuthFilter`**: sin cambios (la autenticación se exige en el controlador, como en `/api/auth/me`).

### Base de datos

Sin migraciones: `users.first_name`, `last_name`, `phone` y `updated_at` ya existen.

## Frontend

### Rutas (`router.tsx`)

Dentro del `Layout` de la tienda, para conservar el header:

```
/perfil                         ProfileGuard → ProfileLayout
  index                         <Navigate to="/perfil/mi-informacion" replace />
  mi-informacion                MyInformationPage
  *                             ProfileNotFound (con la navegación)
```

### Pantallas y componentes

- **`components/dialog.tsx`** (nuevo, reutilizable): diálogo modal según `design-system/components/Dialog/README.md` (`scrim`, fondo `surface`, `rounded-xl`, `p-6`, `shadow-lg`, título `title-md`). Panel `role="dialog"` `aria-modal` sobre un scrim: mueve el foco al abrir, lo atrapa con Tab, cierra con Escape o al tocar el scrim (`onClose`) y devuelve el foco al disparador. Admite contenido (formulario) y acciones. Como los formularios necesitan más espacio que el diálogo de confirmación del design system, el ancho máximo es `max-w-md` en vez de 320px, texto alineado a la izquierda y sin ícono de notificación; es una extensión del uso, no un token nuevo.
- **`features/perfil/profile-guard.tsx`**: lee `useAuth()`. `isLoading`: nada. Cliente: `<Outlet />`. Sin sesión: `<Navigate to="/iniciar-sesion" state={{ from: location.pathname }} replace />` (el `ReturnPathRedirect` existente devuelve al perfil tras el login). Administrador: `components/not-found.tsx`, como el guard de `/admin`.
- **`features/perfil/profile-layout.tsx`**: dos columnas bajo el header: `ProfileNav` a la izquierda (`w-64`, sin plegado) y `<main>` con `<Outlet />`.
- **`features/perfil/profile-sections.ts`**: `[{ path: 'mi-informacion', label: 'Mi información' }]`, para que HU-24 a HU-26 agreguen pestañas sin tocar el componente.
- **`features/perfil/components/profile-nav.tsx`**: `<nav aria-label="Perfil">` con `NavLink` por sección (`aria-current="page"`), mismos estilos de ítem que `AdminNav` (`min-h-12 rounded-md`, activo `bg-action-secondary font-bold`, hover `bg-surface-celeste`) e ícono SVG en línea. Ocupa todo el alto bajo el header (el `Layout` pasa a ser `flex min-h-svh flex-col` y `ProfileLayout` usa `flex-1`) y al fondo (`mt-auto`) tiene "Cerrar sesión", con la misma lógica que el header: `useLogout`, navega a `/` con `loggedOut` y, si falla, `Notification` de error.
- **`features/perfil/my-information-page.tsx`**: lee el usuario de `useAuth()`. Muestra dos `Card`: "Datos personales" (nombres, apellidos, teléfono — "No registrado" si no hay —, correo; botón "Editar datos") y "Contraseña" (texto de apoyo y botón "Cambiar contraseña" o "Crear contraseña" según `user.hasPassword`).
- **`features/perfil/components/edit-profile-dialog.tsx`**: `Dialog` con `react-hook-form` + `zod` (nombres/apellidos obligatorios, teléfono `^9\d{8}$`, `trim`). Valores iniciales del usuario; se reinician con `reset` cada vez que se abre. "Guardar" deshabilitado mientras no haya cambios (`formState.isDirty`) o se esté enviando. Error de servidor en el campo si hay `fieldErrors`; si no, mensaje de formulario "No pudimos guardar tus datos, intenta de nuevo". Éxito: cierra y muestra `Notification` "Tus datos fueron actualizados".
- **`features/perfil/components/change-password-dialog.tsx`**: `Dialog` independiente con `currentPassword` (solo si `hasPassword`), `newPassword` (`passwordSchema` de `features/auth`) y confirmación; `refine` para coincidencia, como `reset-password-page`. Los errores `currentPassword`/`newPassword` del servidor van al campo; `429` muestra el mensaje del servidor. Campos vacíos al reabrir (`reset` al abrir). Éxito: cierra, actualiza `hasPassword` en el caché de `/me` y muestra `Notification` "Tu contraseña fue actualizada".
- **`features/perfil/profile-api.ts`** y **`use-profile-mutations.ts`**: `updateProfile` y `changePassword` con la instancia `api`. `useUpdateProfile` hace `setQueryData(ME_QUERY_KEY, user)` con la respuesta, lo que actualiza el nombre del header sin recargar.
- **`context/auth-context.tsx`**: `AuthUser` agrega `hasPassword: boolean`.
- **`components/header.tsx`**: si `user.role === 'CLIENTE'`, el menú de cuenta agrega, antes de "Cerrar sesión", un `Link role="menuitem"` "Mi perfil" a `/perfil`.
- **`features/perfil/profile-not-found.tsx`**: "Página no encontrada" dentro del perfil.
- Design system: `Dialog`, `Card`, `Input`, `Button`, `Notification` y estilos de ítem de la navegación del panel. Sin tokens nuevos.

## Seguridad

- El usuario se toma del JWT, nunca del cuerpo: no se puede editar a otra persona.
- La contraseña actual se verifica en el servidor con `PasswordEncoder.matches`, con límite de intentos por usuario, para que una sesión robada no sirva para probar contraseñas ilimitadamente ni para cambiarla sin conocerla (salvo cuentas Google sin contraseña, donde la sesión es la única prueba).
- Al cambiar la contraseña se revocan los refresh tokens de las demás sesiones; los `access_token` ya emitidos viven hasta 15 minutos (riesgo aceptado, igual que HU-05).
- El guard del frontend es solo UX; el servidor rechaza visitante (`401`) y administrador (`403`).
- Ni `password`, `currentPassword` ni `newPassword` aparecen en `toString()` de los DTO (patrón de `LoginRequest`).

## Decisiones

- **`PUT` y no `PATCH`**: el diálogo siempre envía los tres campos.
- **Dos endpoints, dos diálogos**: datos básicos y contraseña no comparten solicitud ni formulario, así que cada uno puede fallar sin afectar al otro.
- **Contador de intentos propio**: no reutiliza el del login para que un atacante con una sesión no bloquee el login del dueño.
- **`hasPassword` en `UserResponse`**: es la forma más simple de que el diálogo sepa qué pedir; no filtra nada sensible.
- **Navegación del perfil dentro del `Layout`**: a diferencia de `/admin`, aquí sí se quiere heredar el header.
- **Diálogo propio y no `<dialog>` nativo**: jsdom no implementa `showModal()`, y así el comportamiento (foco, Escape, scrim) queda cubierto por tests.
- **Cierre de sesión desde `/perfil`**: el guard redirigía al login al ver `user = null` antes de que el header navegara a `/` (comprobado con un test). Ahora, si el usuario ya había sido Cliente en esa pantalla, el guard renderiza nada y deja que el header navegue; un visitante que llega directo sí va al login.

## Impacto en docs/

- `docs/cronograma.md`: marcar HU-23 como hecha al cerrar.
- `docs/diagrama-de-base-de-datos.md`: ya menciona que HU-23 edita `first_name`, `last_name`, `phone`; sin cambios.
- Arquitectura y casos de uso ya incluyen "Gestionar perfil" (E5); sin cambios.
