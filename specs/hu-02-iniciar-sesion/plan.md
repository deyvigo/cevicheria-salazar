# Plan: HU-02 — Iniciar sesión

`spec.md` en estado Clarificada.

## Backend

### Endpoint

- **`POST /api/auth/login`**
  - Request body: `{ "email": "...", "password": "..." }`
  - Éxito → `200 OK` (no `201`: no se crea nada, solo se inicia sesión). Responde el perfil del usuario (`UserResponse`, igual que HU-01) y pone las mismas dos cookies que el registro (`access_token`, `refresh_token`; `httpOnly`/`Secure`/`SameSite=Strict`).
  - Credenciales inválidas, correo inexistente o cuenta inactiva → `401 Unauthorized`, `ApiError` con `fieldErrors: []` y `message: "Correo o contraseña incorrectos."` (sin `fieldErrors` porque no se asocia a un campo puntual — ver spec, casos borde).
  - Bloqueado por intentos fallidos → `429 Too Many Requests`, `ApiError` con `message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."`.

### Capas

- **Controlador** (`AuthController.login`, mismo controlador que `register`): recibe `LoginRequest`, delega a `AuthService.login(...)`, pone las cookies igual que en el registro.
- **DTO** `LoginRequest` (record, en `auth/dto/`): `email` (`@NotBlank @Email`), `password` (`@NotBlank`, sin el patrón de complejidad de HU-01 — aquí se *verifica* una contraseña ya creada, no se *crea* una nueva). Mismo truco de constructor compacto para recortar espacios y pasar el correo a minúsculas.
- **Repositorio**: se agrega `UserRepository.findByEmail(String email)` (no existía; HU-01 nunca necesitó buscar por correo).
- **`LoginAttemptService`** (nuevo, en `auth/`): encapsula el anti-fuerza-bruta en Redis.
  - `checkNotBlocked(email)`: lee el contador `login:attempts:<email>`; si ya alcanzó el máximo, lanza `TooManyAttemptsException` **antes** de tocar la base de datos o verificar la contraseña.
  - `recordFailure(email)`: `INCR` del contador; si es el primer intento, le pone TTL (15 min).
  - `recordSuccess(email)`: `DEL` del contador.
- **Servicio** (`AuthService.login`):
  1. Normaliza el correo (ya lo hace `LoginRequest`).
  2. `loginAttemptService.checkNotBlocked(email)`.
  3. Busca el usuario por correo. Si no existe, o no tiene `passwordHash`, o `!passwordEncoder.matches(...)`, o `!user.isActive()` → `loginAttemptService.recordFailure(email)` y lanza `InvalidCredentialsException`. Las cuatro condiciones devuelven exactamente el mismo error (ver spec).
  4. Si todo es correcto: `loginAttemptService.recordSuccess(email)`, genera el JWT de acceso y un refresh token (mismo código que `register`, ya privado en `AuthService`), devuelve `AuthResult`.

### Errores nuevos (`common/exception`)

- `InvalidCredentialsException` → `401`, mensaje genérico. Deliberadamente **no** reutiliza el `AuthenticationException` que ya maneja `ApiExceptionHandler` (ese es para "no autenticado al pedir un recurso protegido", un caso distinto con otro mensaje).
- `TooManyAttemptsException` → `429`, mensaje de bloqueo.
- Ambas con su `@ExceptionHandler` agregado al `ApiExceptionHandler` existente (mismo patrón que `FieldConflictException` en HU-01: errores genéricos en `common`, no atados a `auth`).

## Frontend

- **Pantalla**: `src/features/auth/LoginPage.tsx`, ruta `/iniciar-sesion` (nueva en `router.tsx`).
- **Formulario**: `react-hook-form` + `zod`. A diferencia de `RegisterPage`, el esquema **no** repite la regla de complejidad de contraseña (acá se verifica, no se crea): solo `email` (`@Email`) y `password` (`min(1)`) obligatorios.
- **Componentes**: reusa `Input`/`Button` de HU-01, sin componentes nuevos.
- **Error genérico**: como el backend no asocia el error a un campo, se usa el error de nivel de formulario de `react-hook-form` (`setError('root', { message })`), mostrado arriba del botón — no bajo un campo específico. Mismo mecanismo para el mensaje de bloqueo (`429`), solo cambia el texto.
- **`authApi.ts`**: se agrega `login(payload)` junto al `register` ya existente (mismo archivo, mismo patrón con axios).
- **Éxito**: `useAuth().setUser(...)` y redirección a `/`. La spec no pide una confirmación visual (a diferencia del registro), así que no hay toast aquí.

## Seguridad

- El límite de intentos vive en Redis, con clave por correo (no por IP): simple y suficiente para esta historia; no protege contra un atacante que rota de correo en correo, pero ese no es el objetivo de esta historia (si hiciera falta, sería una historia aparte sobre límites por IP).
- Las cuatro causas de fallo (correo inexistente, contraseña incorrecta, cuenta inactiva, sin contraseña) se verifican todas antes de decidir la respuesta, y las cuatro producen el mismo `InvalidCredentialsException` — ninguna rama de código puede filtrar por error cuál de las cuatro fue.
- El chequeo de bloqueo (`checkNotBlocked`) ocurre *antes* de ir a la base de datos: evita gastar una consulta y un `BCrypt.matches` (costoso a propósito) en un correo ya bloqueado.

## Decisiones

- `LoginAttemptService` como clase propia (no como métodos sueltos en `AuthService`): mantiene el acceso a Redis en un solo lugar, testeable por separado con el mismo Redis de Testcontainers que ya usa `AuthControllerIT`.
- `InvalidCredentialsException`/`TooManyAttemptsException` en `common/exception` (no en `auth`): son errores genéricos de "credenciales" y "límite de intentos", reutilizables si otra historia futura los necesita (ej. cambiar contraseña).
- Sin `fieldErrors` en el `401`: a diferencia de HU-01 (donde el campo `email` sí importa, porque confirma que ese correo existe), aquí señalar un campo filtraría información — por eso el frontend muestra el error a nivel de formulario, no bajo un input.

## Impacto en docs/

Ninguno: no hay cambios de arquitectura ni de modelo de datos (Redis para intentos de login ya estaba contemplado en `docs/diagrama-de-arquitectura.md` desde antes de HU-01).
