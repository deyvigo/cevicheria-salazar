# Tareas: HU-36 — Ver y editar mis datos personales (Administrador)

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] `ProfileService`: `loadCustomer` → `loadUser`, sin rechazar al administrador — cubre: editar datos y contraseña como administrador; protección (`401` sin sesión, solo la propia cuenta) — verificación: `ProfileServiceTest.anAdministratorHasNoProfile` pasa a `anAdministratorCanUpdateTheirProfile` (actualiza los campos) y se agrega uno equivalente para cambiar la contraseña.
- [x] `ProfileControllerIT.anAdministratorIsForbidden` pasa a `anAdministratorCanEditTheirOwnData` y se agrega el cambio de contraseña de un administrador — cubre: API para el administrador, cierre de otras sesiones — verificación: con un administrador (rol cambiado en base de datos), `PUT /api/perfil` `200` y `GET /api/auth/me` refleja los cambios; `PUT /api/perfil/contrasena` `204`, la otra sesión falla en `/api/auth/refresh`, y puede iniciar sesión con la nueva contraseña; sin sesión sigue `401`; una cuenta desactivada recibe `401`.

## Frontend

- [x] `admin-sections.ts` (`ADMIN_ACCOUNT_SECTION`) y extraer el ícono de persona a una constante compartida con `profile-nav` — cubre: sección "Mi información" en la navegación — verificación: `pnpm build` sin errores de tipos.
- [x] `admin-nav.tsx`: ítem "Mi información" como última opción de la lista, con "Cerrar sesión" separada al fondo — cubre: navegación (posición, `aria-current`, plegado) — verificación: `admin-nav.test.tsx` — lista las cuatro secciones más "Mi información" con `href="/admin/mi-informacion"` y es el último enlace; es el actual con `aria-current="page"` en esa ruta; plegado conserva el ítem accesible; "Cerrar sesión" sigue siendo un botón aparte (no un enlace de la lista).
- [x] `router.tsx`: ruta `mi-informacion` en `/admin` — cubre: abrir la sección, sin header de la tienda, recarga, 404 para no administradores — verificación: `admin-layout.test.tsx` — `/admin/mi-informacion` muestra "Mi información" con los datos del administrador, sin `banner` y con la navegación del panel y su ítem activo; `/admin` sigue redirigiendo a `/admin/platos`; `AdminGuard` sigue mostrando el 404 a visitantes y clientes (cubierto por los tests del guard).
- [x] `my-information-page` y diálogos dentro del panel — cubre: ver datos, editar datos, cambiar contraseña con las mismas reglas — verificación: `admin-layout.test.tsx` — editar los datos desde la sección actualiza lo mostrado; "Cambiar contraseña" abre el diálogo independiente; (las validaciones ya están cubiertas por los tests de HU-23, que no cambian).
- [x] `lib/api.ts`: `isAdminSessionRequest` incluye `/perfil` solo si el usuario en caché es administrador — cubre: sesión vencida o cuenta desactivada en la sección — verificación: sin test propio del interceptor (igual que HU-04 y HU-28); prueba manual.

## Documentación

- [x] `specs/hu-23-datos-personales/spec.md` ya ajustado (API sirve al administrador): revisar que no quede ningún criterio que diga `403` para administradores — verificación: `grep -n "403" specs/hu-23-datos-personales/*.md`.
- [x] `docs/diagrama-de-casos-de-uso.md` (texto): "Gestionar perfil" también para el Administrador. La imagen del diagrama no se tocó: queda pendiente rehacerla — verificación: revisión visual.

## Verificación cruzada

- [x] Prueba en navegador (`./scripts/dev.sh`) con el administrador por defecto: "Mi información" aparece como último ítem de la lista y "Cerrar sesión" sigue al fondo, separada; la sección muestra sus datos (teléfono "No registrado" si no tiene) sin header de la tienda; editar datos actualiza la pantalla; cancelar o Escape descarta; cambiar la contraseña con la actual incorrecta falla en el campo y con 4 intentos erróneos bloquea; con la sesión abierta en otro navegador, ese navegador pierde la sesión; volver a iniciar sesión con la nueva contraseña funciona; recargar en `/admin/mi-informacion` conserva la sección; como Cliente y sin sesión `/admin/mi-informacion` da 404; como administrador `/perfil` da 404 y el menú de la tienda no ofrece "Mi perfil"; plegar la barra conserva el ítem; con la cuenta desactivada en base de datos, guardar saca del panel.
- [x] Antes de commitear: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`.
- [x] Marcar HU-36 como hecha en `docs/cronograma.md`; recorrer cada criterio de `spec.md` contra la implementación y marcar la spec como **Hecha**.
