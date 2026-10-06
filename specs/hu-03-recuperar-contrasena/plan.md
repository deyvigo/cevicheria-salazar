# Plan: HU-03 — Recuperar contraseña por correo

`spec.md` en estado Clarificada.

## Backend

### Base de datos

Sin migración nueva: la tabla `password_reset_tokens` (`user_id`, `token_hash` único, `expires_at`, `used_at`, `created_at`) ya existe en `V1__init_auth.sql` y Hibernate está en `validate`. Solo falta la entidad JPA.

### Endpoints

- **`POST /api/auth/forgot-password`**
  - Request body: `{ "email": "..." }`
  - Siempre `202 Accepted` con `{ "message": "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña." }`, exista o no la cuenta, esté activa o no, o haya fallado el envío (ver spec, casos borde).
  - Correo con formato inválido o vacío → `400` con `fieldErrors` (validación estándar, mismo `ApiError` de HU-01).
  - Límite superado (más de 3 solicitudes por correo en 24 h) → `429`, `ApiError` con `message: "Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde."`. El límite cuenta toda solicitud, exista o no el correo, para que el `429` tampoco permita enumerar cuentas.
- **`GET /api/auth/reset-password/validate?token=<código>`**
  - `204 No Content` si el código es válido (existe, no expiró, no se usó); `400` con `message: "Este enlace no es válido o ya venció."` si no. Lo usa el frontend al abrir el enlace para mostrar el formulario o el mensaje de error sin esperar al envío.
- **`POST /api/auth/reset-password`**
  - Request body: `{ "token": "...", "password": "..." }`
  - Éxito → `204 No Content`. No inicia sesión (ver spec, fuera de alcance).
  - Contraseña que incumple las reglas de HU-01 → `400` con `fieldErrors`.
  - Código inexistente, expirado o usado → `400` con el mismo mensaje de arriba, sin distinguir la causa.

Los tres son públicos (`SecurityConfig` ya hace `permitAll`).

### Capas

- **Controlador**: `PasswordResetController` en `auth/` (no se agranda `AuthController`), con los tres endpoints.
- **DTOs** (`auth/dto/`): `ForgotPasswordRequest` (`email` con `@NotBlank @Email` y normalización trim + minúsculas, igual que `LoginRequest`) y `ResetPasswordRequest` (`token` `@NotBlank`, `password` con las mismas reglas de `RegisterRequest`: mínimo 8, una letra y un número). La regla de contraseña se extrae a una constante/anotación compartida para no duplicar el patrón.
- **Entidad y repositorio**: `PasswordResetToken` (mismo estilo que `RefreshToken`: `markUsed()`, `@PrePersist`) y `PasswordResetTokenRepository` con:
  - `findByTokenHashForUpdate(String)` con `PESSIMISTIC_WRITE`, igual que `RefreshTokenRepository`, para que dos envíos simultáneos del mismo enlace se serialicen y el segundo lo vea usado. `validate` usa `findByTokenHash` sin bloqueo (corre en una transacción de solo lectura, donde Postgres no permite `SELECT ... FOR UPDATE`).
  - `invalidateActiveByUserId(Long userId)`: `UPDATE ... SET used_at = now() WHERE user_id = ? AND used_at IS NULL`, para dejar solo el enlace más reciente válido.
- **`PasswordResetRequestLimiter`** (nuevo, en `auth/`): mismo patrón que `LoginAttemptService`, clave Redis `password-reset:requests:<email>`, máximo 3, TTL 24 h (el contador se reinicia al día de la primera solicitud). `checkAndRecord(email)` incrementa y lanza `TooManyAttemptsException` al superar el máximo (a diferencia del login, aquí cuenta cada solicitud, no solo los fallos).
- **`PasswordResetService`** (nuevo, en `auth/`):
  - `requestReset(email)`:
    1. `limiter.checkAndRecord(email)`.
    2. Busca usuario por correo; si no existe o `!isActive()` retorna sin hacer nada (la respuesta es igual).
    3. `invalidateActiveByUserId`, genera el código (32 bytes de `SecureRandom`, Base64 URL-safe sin relleno), guarda su hash SHA-256 con `expires_at = now + 30 min` y envía el correo con `app.frontend-url + /restablecer-contrasena?token=<código>`.
    4. Un fallo de envío se captura, se registra en el log y no se propaga.
  - `validate(token)`: busca por hash; lanza `InvalidResetTokenException` si no existe, `usedAt != null` o expiró.
  - `resetPassword(token, password)` (`@Transactional`): mismo chequeo que `validate` (con el bloqueo), actualiza `users.password_hash` con `PasswordEncoder`, marca el token como usado, revoca todos los `refresh_tokens` activos del usuario (nuevo `RefreshTokenRepository.revokeAllByUserId`) y llama a `loginAttemptService.recordSuccess(email)` para limpiar el bloqueo de HU-02.
- **Hash del código**: el `hash(...)` SHA-256 hoy es privado en `AuthService`; se extrae a un componente `TokenHasher` en `common/security` y lo usan `AuthService` y `PasswordResetService`.
- **Envío de correo** (`common/mail`, integración externa solo en la capa de servicios):
  - Dependencia `spring-boot-starter-mail` en `pom.xml`; propiedades `spring.mail.*` desde las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` que ya están en `.env.example`, más `SMTP_FROM` nueva.
  - `MailService` con `sendPasswordResetEmail(to, firstName, link)` sobre `JavaMailSender`. Correo en español, tuteando, sin emojis, HTML simple. Incluye siempre las reglas de la spec: vigencia de 30 minutos, un solo uso, solo el enlace más reciente es válido, máximo 3 solicitudes por día, y que se puede ignorar si no fue pedido.
  - Los valores de 30 min / 3 / 24 h se leen de una sola fuente (propiedades `app.password-reset.*` con esos defaults) para que el correo y la lógica no se desincronicen.
- **En desarrollo**: el correo se envía por SMTP real también en `dev` (el flujo se prueba desde la bandeja de entrada). `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` y `SMTP_FROM` se completan en `backend/.env` (ej. `smtp.gmail.com:587` con STARTTLS y una contraseña de aplicación). Si `SMTP_HOST` está vacío, el backend arranca igual (`JavaMailSender` es opcional) y el envío falla con un error en el log, que no se propaga al usuario.

### Errores nuevos (`common/exception`)

- `InvalidResetTokenException` → `400`, `message: "Este enlace no es válido o ya venció."`, con su `@ExceptionHandler` en `ApiExceptionHandler`. Reusa `TooManyAttemptsException` (429) de HU-02.

## Frontend

- **Enlace en login**: en `login-page.tsx`, "¿Olvidaste tu contraseña?" (`Link` a `/olvide-contrasena`) bajo el campo de contraseña, con el mismo estilo de enlace que "Regístrate".
- **`src/features/auth/forgot-password-page.tsx`**, ruta `/olvide-contrasena`: formulario `react-hook-form` + `zod` con solo `email`. Al enviar con éxito reemplaza el formulario por el mensaje de confirmación genérico del backend; en `429` muestra el mensaje como error de formulario (`setError('root', ...)`), igual que `login-page`.
- **`src/features/auth/reset-password-page.tsx`**, ruta `/restablecer-contrasena`: lee `token` de `useSearchParams`, llama a `validate` al montar (`useQuery`). Si es inválido o falta el parámetro, muestra "Este enlace no es válido o ya venció." con un enlace a `/olvide-contrasena`. Si es válido, formulario con `password` y `confirmPassword` (las reglas de HU-01 y que coincidan, validadas con `zod`; la confirmación no se envía al backend, igual que en `register-page`). Un `400` por token (carrera: venció mientras escribía) muestra el mismo mensaje inválido. Éxito → `navigate('/iniciar-sesion', { state: { passwordReset: true } })`.
- **Mensaje de éxito en login**: `login-page.tsx` lee `location.state?.passwordReset` y muestra arriba del formulario "Tu contraseña fue actualizada. Inicia sesión." con el componente `Notification` del design system (variante de éxito).
- **`auth-api.ts`**: `forgotPassword`, `validateResetToken`, `resetPassword`, mismo patrón axios. Hooks en `use-auth-mutations.ts` (`useForgotPassword`, `useResetPassword`); la validación como `useQuery` dentro de la página, con `retry: false`.
- **Componentes**: reusa `Input`, `Button`, `AuthShell` y `Notification`; sin componentes nuevos. Las reglas de contraseña se reutilizan del esquema `zod` de `register-page` (extraer a un módulo compartido de `features/auth/` si hoy está inline).
- **Rutas**: `router.tsx` agrega `/olvide-contrasena` y `/restablecer-contrasena`.

## Seguridad

- El código viaja solo en el enlace y se guarda únicamente su hash SHA-256; 256 bits aleatorios hacen innecesario un hash lento (a diferencia de contraseñas), igual que el refresh token.
- La respuesta de `forgot-password` es idéntica en todos los casos (cuenta inexistente, inactiva, error de SMTP) y el límite por correo cuenta todas las solicitudes, así no se puede enumerar correos por contenido ni por código de estado.
- El envío del correo no bloquea ni cambia la respuesta; con el SMTP caído el usuario no puede distinguirlo de un éxito (el error queda en el log).
- `resetPassword` corre en una transacción con el token bloqueado: un enlace no se puede consumir dos veces en paralelo.
- El enlace con el código queda en el historial del navegador y en logs de proxy; se mitiga con vigencia corta y un solo uso.

## Decisiones

- **Endpoint `validate` separado** en vez de comprobar el código solo al enviar: permite mostrar "enlace no válido" apenas se abre, sin que el usuario escriba una contraseña para descubrirlo. Consecuencia aceptada: permite comprobar si un código existe, pero es de 256 bits, no adivinable.
- **`PasswordResetService` y `PasswordResetController` propios**, no dentro de `AuthService`/`AuthController`: `AuthService` ya concentra registro, login y refresh; esto es un flujo con su propia dependencia (correo).
- **`TokenHasher` compartido** en `common/security` en vez de copiar el SHA-256 por segunda vez.
- **Límite contando solicitudes, no fallos** (a diferencia de `LoginAttemptService`), porque aquí no hay "intento fallido" que distinguir sin filtrar si la cuenta existe.
- **Sin migración**: la tabla ya cubre la historia; si la implementación obliga a agregar columnas, se actualiza esta sección y `docs/diagrama-de-base-de-datos.md`.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: ninguno (la tabla ya está descrita).
- `docs/diagrama-de-arquitectura.md` y `docs/diagrama-de-despliegue.md`: ya mencionan el SMTP para HU-03; sin cambios. Se agrega `SMTP_FROM` a `backend/.env.example`.
