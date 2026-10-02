# Tareas: HU-01 — Registro de cliente

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: modelo y validación

- [x] Crear `RegisterRequest` (DTO, record) con validaciones Jakarta Bean Validation (`email`, `firstName`, `lastName`, `phone`, `password`) y normalización en el constructor compacto (recortar espacios, correo en minúsculas) — cubre: campos obligatorios vacíos, correo inválido, teléfono inválido, contraseña inválida, espacios/mayúsculas (casos borde) — verificación: `RegisterRequestValidationTest` — **14/14 tests pasan** (incluye que `toString()` nunca expone la contraseña).

## Backend: servicio de registro

- [x] Implementar `AuthService.register(...)`: hashear la contraseña con `BCryptPasswordEncoder` e insertar en `users` (`role=CLIENTE`, `email_verified=false`, `is_active=true`) — cubre: registro exitoso crea la cuenta — verificación: `AuthServiceTest` (Mockito) — comprueba el hash y los valores por defecto guardados.
- [x] Manejar el correo duplicado: `AuthService` captura `DataIntegrityViolationException` de la restricción única de `email` y lanza `FieldConflictException("email", ...)`; su `@ExceptionHandler` ya vive en `ApiExceptionHandler` (common/exception, HT-09) — cubre: mensaje de correo ya en uso, condición de carrera — verificación: `AuthServiceTest` (unitario) + `AuthControllerIT.duplicateEmailReturns409WithFieldError` (integración, dos registros reales con el mismo correo). **Nota**: terminó siendo `FieldConflictException` (genérica, en `common/exception`) en vez de `EmailAlreadyRegisteredException` propia de `auth` — evita que `common` dependa de una excepción de `auth`; ver `plan.md`.
- [x] Generar el JWT de acceso (`JwtService`, nuevo en `common/security`) y el refresh token (hash SHA-256 en `refresh_tokens`) al completar el registro — cubre: login automático tras registrarse — verificación: `AuthServiceTest` comprueba que se guarda el refresh token y que `AuthResult` trae el JWT.

## Backend: endpoint

- [x] Implementar `AuthController.register` (`POST /api/auth/register`): `201` + cookies `access_token`/`refresh_token` (`httpOnly`/`Secure`/`SameSite=Strict`) en éxito, `400` con `fieldErrors` en validación fallida, `409` en correo duplicado — cubre: registro exitoso, correo duplicado, campos vacíos, correo/teléfono/contraseña inválidos, login automático — verificación: `AuthControllerIT` (MockMvc + Testcontainers) — **3/3 tests pasan** (éxito con cookies, duplicado, teléfono inválido).

## Frontend: componentes base

- [x] Crear los wrappers `src/components/Input.tsx`, `src/components/Button.tsx` y `src/components/Notification.tsx` con utilities de Tailwind (tokens vía `tailwind-theme.css`) — cubre: mensajes y componentes siguen el tono del `design-system/` — verificación: estilos revisados contra `design-system/components/{Input,Button,Notification}/README.md` (estados: reposo, foco, error, deshabilitado); ícono `notif-success.svg` copiado a `public/icons/` para el toast de éxito.

## Frontend: formulario de registro

- [x] Construir `src/features/auth/RegisterPage.tsx` (ruta `/registro` en `router.tsx`) con los campos de la spec, usando `react-hook-form` + `zod` (`zodResolver`) con las mismas reglas que el backend — cubre: campos vacíos, correo inválido, teléfono inválido, contraseña inválida, confirmación que no coincide — verificación: `RegisterPage.test.tsx` (Testing Library + user-event) — **7/7 tests pasan**; `pnpm dev` sirve `/registro` sin errores (revisión visual pixel a pixel queda pendiente de un navegador real).

## Frontend: integración con la API

- [x] Conectar el formulario a `POST /api/auth/register` con `src/lib/api.ts` (axios): en éxito llama `useAuth().setUser(...)`, muestra el toast de éxito y redirige; en `400`/`409` mapea `fieldErrors` de la `ApiError` a los campos con `setError` de `react-hook-form`, sin perder lo ya escrito — cubre: registro exitoso, correo duplicado, login automático, tono del design system — verificación: `RegisterPage.test.tsx` (mocks) + prueba manual real por HTTP contra el backend corriendo (ver Verificación cruzada): `201` con las dos cookies, `409` con el mismo cuerpo que mapea el frontend, `400` en teléfono inválido.

## Verificación cruzada

- [x] Comprobar que el carrito armado como Visitante se conserva después de registrarse — cubre: HU-35 / conservación del carrito — verificación: revisado `RegisterPage.tsx`, no llama a `useCart().clear()` en ningún punto del flujo; se cumple por construcción de `CartContext` (HT-09).
- [x] Prueba manual end-to-end real: backend (`./mvnw spring-boot:run`, perfil `dev`) contra Postgres/Redis de `docker-compose.dev.yml`, llamado por HTTP con el header `Origin` del frontend — `201` con cookies `access_token`/`refresh_token` (`httpOnly`/`Secure`/`SameSite=Strict`) y CORS correcto; `409` con `fieldErrors` en `email`; `400` con `fieldErrors` en `phone`; fila creada en `users` (`role=CLIENTE`, `email_verified=false`) y en `refresh_tokens` (hash de 64 caracteres, expira en 30 días).
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final — todos verificados (ver arriba). Se marca la spec como **Hecha**.
