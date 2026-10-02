# Plan: HU-01 — Registro de cliente

`spec.md` en estado Clarificada.

## Backend

### Endpoint

- **`POST /api/auth/register`**
  - Request body:
    ```json
    { "email": "...", "password": "...", "firstName": "...", "lastName": "...", "phone": "..." }
    ```
  - Éxito → `201 Created`. Responde el perfil del usuario (sin `password_hash`) y, por el login automático, pone el access token (JWT) en una cookie `httpOnly` + `Secure` + `SameSite=Strict`, e inicializa el refresh token (ver Seguridad).
  - Correo duplicado → `409 Conflict`, con la forma de `ApiError` ya definida en `common/exception` (HT-09): `fieldErrors: [{"field": "email", "message": "Este correo ya está registrado."}]`.
  - Validación fallida (campo vacío, formato de correo, teléfono o contraseña) → `400 Bad Request`, misma forma de `ApiError` (ya la produce `ApiExceptionHandler.handleValidation`, sin cambios).

### Capas

- **Controlador** (`AuthController`): recibe `RegisterRequest` (DTO), delega a `AuthService.register(...)`, traduce el resultado a la respuesta HTTP y pone la cookie.
- **Validación**: anotaciones de Jakarta Bean Validation en el DTO:
  - `email`: `@NotBlank @Email`.
  - `firstName`, `lastName`: `@NotBlank`.
  - `phone`: `@NotBlank @Pattern(regexp = "^9[0-9]{8}$")` (9 dígitos, empieza con 9).
  - `password`: `@NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$")` (mínimo 8 caracteres, al menos una letra y un número).
  - Antes de validar: recortar espacios de `email`, `firstName`, `lastName`, `phone`; normalizar `email` a minúsculas.
- **Servicio** (`AuthService.register`):
  1. Normaliza y valida los datos de entrada (ya cubierto por el DTO; el servicio no revalida formato).
  2. Hashea la contraseña con `BCryptPasswordEncoder`.
  3. Inserta en `users` (`role = 'CLIENTE'`, `email_verified = false`, `is_active = true`).
  4. Si la inserción falla por la restricción única de `email` (concurrencia), lanza `EmailAlreadyRegisteredException` (nueva, específica de HU-01).
  5. Genera el JWT de acceso y un refresh token, inserta la fila en `refresh_tokens` (con `user_agent` del request).
  6. Devuelve el usuario creado + los tokens al controlador.
- **Repositorio**: `UserRepository` (Spring Data JPA) ya cubre `users`; `RefreshTokenRepository` para `refresh_tokens`. Ambas tablas y su relación ya existen en `docs/diagrama-de-base-de-datos.md`, no se requieren cambios de esquema.

## Frontend

- **Pantalla**: `src/features/auth/RegisterPage.tsx`, ruta `/registro` (agregada en `router.tsx`). Formulario con los campos de la spec: nombres, apellidos, correo, teléfono, contraseña y **confirmar contraseña**.
- **Formulario**: `react-hook-form` + `zod` (`zodResolver`), replicando en el schema las mismas reglas del backend (correo, teléfono `^9[0-9]{8}$`, contraseña `8+ con letra y número`) más la coincidencia de `password`/`confirmPassword` (`z.refine` o `superRefine` sobre el objeto). Es la primera vez que se usa este patrón; queda como referencia para los formularios siguientes.
- **Componentes**: esta es la primera pantalla real, así que aquí se crean los wrappers de `src/components/` (`Input.tsx`, `Button.tsx`) con utilities de Tailwind — ver `src/components/README.md` y comparar visualmente contra `design-system/components/Input|Button/preview.html`, sin copiar sus clases `cv-*`.
  - `Input`: un campo por dato, `label` visible y un mensaje de error en `text-error-text` bajo el campo (incluye el de correo duplicado que devuelve la API, mostrado bajo el campo de correo — no como toast, porque es un error del formulario, no un evento del sistema). `type="password"` agrega automáticamente el toggle de mostrar/ocultar (ícono de ojo, `aria-label` dinámico) — no estaba en el diseño original de `Input` ni en `design-system/components/Input`, se agregó a pedido en los campos de "Contraseña" y "Confirmar contraseña".
  - `Button`: primario (`bg-action`, "Crear cuenta"), deshabilitado mientras se envía la solicitud.
- **Llamada a la API**: `api.post('/auth/register', data)` con la instancia de axios de `src/lib/api.ts` (ya trae `withCredentials: true`, así la cookie del login automático queda seteada).
- **Sesión y carrito tras el éxito**: `useAuth().setUser(...)` con el usuario que devuelve la API. El carrito **no requiere ninguna acción**: `CartContext` ya persiste en `localStorage` independiente de la sesión (HT-09), así que HU-35 se cumple por construcción mientras el flujo de registro no llame a `clear()`.
- **Notificación de éxito**: toast de éxito (wrapper de `Notification`, mismo patrón que `Input`/`Button`) mientras se redirige a la carta, ya autenticado.
- **Flujo**: `zod` valida en el cliente (incluida la coincidencia de contraseñas) → si pasa, `POST /api/auth/register` → `201`: `setUser(...)` + toast + redirigir → `409`/`400`: mapear `fieldErrors` de la `ApiError` a los campos del formulario (`setError` de `react-hook-form`) sin perder lo ya escrito.

## Seguridad

- Contraseña con `BCryptPasswordEncoder` (cost factor por defecto de Spring Security); nunca se guarda ni se registra en logs en texto plano.
- Cookie del JWT: `httpOnly`, `Secure`, `SameSite=Strict`, según el esquema de `docs/diagrama-de-arquitectura.md` (Spring Security, JWT en cookies).
- Condición de carrera de correo duplicado: no se resuelve con un `SELECT` previo (insuficiente bajo concurrencia); la tabla `users.email` ya tiene restricción única (`docs/diagrama-de-base-de-datos.md`). El servicio captura la violación y lanza `EmailAlreadyRegisteredException`.
- No se añade rate limiting a este endpoint: la spec deja el anti-fuerza-bruta de Redis para el login (HU-02), no para el registro.

## Decisiones

- Se usa el patrón insertar-y-capturar-violación-de-restricción para el correo duplicado, en vez de verificar existencia antes de insertar, por ser la única forma segura ante registros simultáneos (caso borde de la spec).
- El mensaje de correo duplicado no incluye una acción (ni enlace a login, ni botón), tal como se decidió en la spec: solo informa.
- El refresh token se crea en el mismo flujo de registro para cumplir "inicia sesión automáticamente" sin una segunda llamada a `/login`.
- La confirmación de contraseña se valida solo en el frontend y no viaja al backend: es una ayuda de UX contra errores de tipeo, no una regla de negocio ni de seguridad — el `RegisterRequest` del backend no gana un campo `confirmPassword`.
- `EmailAlreadyRegisteredException` + su `@ExceptionHandler` en `ApiExceptionHandler` es nuevo en esta historia: el handler genérico de `DataIntegrityViolationException` (HT-09) no sabe qué columna violó la restricción, así que no puede dar el `fieldErrors` específico de `email` que pide la spec. Se añade al mismo `ApiExceptionHandler` de `common/exception`, no uno aparte.

## Impacto en docs/

Ninguno: el modelo de datos (`users`, `refresh_tokens`) y la arquitectura ya cubren lo que este plan necesita; no se agregan tablas, columnas ni componentes de infraestructura nuevos.
