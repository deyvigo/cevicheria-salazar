# Spec: HT-11 — Cuenta de administrador por defecto

**Épica**: [E0. Fundamentos del proyecto](../../docs/epicas.md#e0)
**Estado**: Hecha

## Objetivo

Que el sistema arranque siempre con una cuenta de administrador utilizable, para poder entrar al panel `/admin` (HU-28) sin tocar la base de datos a mano. La cuenta nace con datos por defecto (correo, nombre, contraseña) definidos en la configuración; en la práctica es un usuario base que el negocio actualiza con sus datos reales o que sirve de punto de partida para crear otros administradores.

## Contexto (qué ya existe y qué falta)

- La tabla `users` ya tiene `role` (`CLIENTE` | `ADMINISTRADOR`), `email_verified` e `is_active` (migración `V1__init_auth.sql`); no hay ninguna fila de administrador en ningún entorno.
- No existe en la aplicación ningún flujo para crear un administrador: el registro (HU-01) siempre crea `CLIENTE`.
- HU-28 (acceso al panel con rol `ADMINISTRADOR`) y todas las historias del panel dependen de que exista al menos una cuenta así.
- Los valores por defecto viven en `application.yml` bajo `app.*`, con variables de entorno para lo sensible (mismo patrón que `app.jwt.secret`).

## Actor(es)

Equipo de desarrollo y quien opera el VPS (historia técnica). El resultado lo usa el Administrador del negocio.

## Criterios de aceptación

- **Dado** una base de datos sin ningún usuario con ese correo, **cuando** el backend arranca, **entonces** se crea un usuario con rol `ADMINISTRADOR`, `email_verified = true`, `is_active = true` y los datos por defecto configurados (correo, nombre, apellido y teléfono opcional).
- **Dado** la cuenta creada, **cuando** inicio sesión en el login normal con el correo y la contraseña por defecto, **entonces** la autenticación tiene éxito con rol `ADMINISTRADOR` (el acceso al panel lo cubre HU-28).
- **Dado** que la cuenta ya existe, **cuando** el backend arranca de nuevo, **entonces** no se crea otra ni se modifica ninguno de sus datos (idempotente); en particular, si el administrador ya cambió su contraseña o su nombre, esos cambios se conservan.
- **Dado** que existe la cuenta con datos modificados, **cuando** cambio los valores por defecto en la configuración y reinicio, **entonces** la cuenta existente no se toca.
- **Dado** el perfil `prod`, **cuando** la contraseña por defecto no está definida por variable de entorno, **entonces** el backend no arranca y el error indica qué variable falta (no existe contraseña conocida en producción).
- **Dado** el perfil `dev`, **cuando** ejecuto `./scripts/dev.sh` en un clon nuevo, **entonces** la cuenta existe con credenciales de desarrollo documentadas, sin pasos manuales.
- **Dado** la contraseña por defecto, **cuando** se guarda, **entonces** se almacena solo como hash (`password_hash`), con el mismo algoritmo del registro, y nunca aparece en logs.

## Casos borde

- Ya existe un `CLIENTE` registrado con el correo por defecto: el arranque no lo convierte en administrador ni falla en silencio; registra una advertencia y sigue arrancando sin crear la cuenta.
- Dos instancias arrancan a la vez: la restricción `UNIQUE` sobre `email` evita duplicados; la que pierde la carrera lo trata como "ya existe".
- El administrador cambia su correo: al siguiente arranque el correo por defecto ya no existe y se volvería a crear la cuenta base. Para que esto no ocurra, la creación se hace solo si **no existe ningún usuario `ADMINISTRADOR`**, no por correo (ver Decisiones propuestas).
- Contraseña por defecto vacía o más débil que la política del registro en `prod`: el arranque falla.
- La cuenta por defecto queda desactivada (`is_active = false`) por el negocio: no se reactiva al arrancar.
- Los tests de integración parten de una base limpia: la cuenta debe poder controlarse por configuración para no contaminar otros tests.

## Fuera de alcance

- Pantallas o endpoints para crear, editar o desactivar administradores; hoy se hace con el perfil (HU-23) o por base de datos.
- Forzar el cambio de contraseña en el primer inicio de sesión.
- Acceso al panel y guardas por rol en el frontend y la API (HU-28).
- Gestión de varios roles o permisos más finos.

## Decisiones de clarificación

- **Cuándo se crea**: al arrancar, solo si no existe ningún usuario con rol `ADMINISTRADOR` (no por correo), para tolerar que el negocio cambie el correo o cree otros administradores.
- **Dónde se configura**: `application.yml` bajo `app.default-admin.*` (`email`, `password`, `first-name`, `last-name`, `phone`), con variables de entorno `APP_DEFAULT_ADMIN_*`. `app.default-admin.enabled` (por defecto `true`) permite desactivarla en tests.
- **Valores por defecto**: en `dev`, correo `admin@cevicheria-salazar.com`, nombre "Administrador" y apellido "Salazar". En `prod`, el correo y la contraseña vienen obligatoriamente de variables del VPS; no se commitea ninguna contraseña.
- **Contraseña en desarrollo**: la genera `./scripts/dev.sh` en `backend/.env` (`APP_DEFAULT_ADMIN_PASSWORD`) la primera vez y la muestra una vez en consola, igual que `APP_JWT_SECRET`. Si se arranca el backend sin `dev.sh` y sin contraseña, en `dev` se omite la creación con una advertencia.
- **Correo en producción**: variable obligatoria, sin valor por defecto.
- **Primer acceso**: no se exige cambiar la contraseña; queda como recomendación operativa en `docs/diagrama-de-despliegue.md`.
- **Mecanismo**: un componente de arranque en el paquete `auth` (servicio, no migración), porque Flyway no puede leer la configuración ni hashear con el codificador de la aplicación y una contraseña en una migración quedaría commiteada.
