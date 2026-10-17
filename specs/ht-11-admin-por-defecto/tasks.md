# Tareas: HT-11 — Cuenta de administrador por defecto

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] Crear `DefaultAdminProperties` y agregar `app.default-admin.*` a `application.yml`, `app.default-admin.email` a `application-dev.yml` y `APP_DEFAULT_ADMIN_*` a `.env.example` — cubre: configuración por defecto — verificación: cubierto por `DefaultAdminIT` (enlaza `enabled`, correo y contraseña) y por `./mvnw test`.
- [x] Agregar `UserRepository.existsByRole` y la forma de crear un `User` con `email_verified = true` — cubre: crea administrador verificado y activo — verificación: cubierto por la tarea siguiente.
- [x] Crear `DefaultAdminInitializer` con las reglas de arranque del plan — cubre: creación, idempotencia, cliente con el mismo correo, cuenta desactivada, falla en `prod`, hash de la contraseña, sin contraseña en logs — verificación: `DefaultAdminInitializerTest` (Mockito) — crea cuando no hay administradores; no hace nada si ya hay uno; no toca al `CLIENTE` con el mismo correo; en `prod` falla con correo o contraseña vacíos o débiles; fuera de `prod` omite con contraseña vacía; trata `DataIntegrityViolationException` como "ya existe"; guarda `password_hash` y no la contraseña en claro.
- [x] Desactivar la cuenta por defecto en `WithTestSecrets` — cubre: tests sin contaminación — verificación: `./mvnw test -Dtest='*IT'` sigue en verde.

## Pruebas de integración

- [x] Crear `DefaultAdminIT` (Postgres en Testcontainers, `enabled=true`): tras arrancar existe el administrador; `POST /api/auth/login` con el correo y la contraseña por defecto devuelve `200` con rol `ADMINISTRADOR`; reiniciar el inicializador no duplica ni sobrescribe una contraseña cambiada — cubre: creación, login, idempotencia, conserva cambios — verificación: `./mvnw test -Dtest='DefaultAdminIT'`.

## Infraestructura de desarrollo

- [x] Actualizar `scripts/dev.sh`: sincronizar `APP_DEFAULT_ADMIN_*`, generar `APP_DEFAULT_ADMIN_PASSWORD` si falta e imprimir las credenciales la primera vez — cubre: `dev.sh` deja la cuenta lista — verificación: desde un `backend/.env` borrado y desde uno previo, `./scripts/dev.sh` arranca y el login con las credenciales impresas funciona; un segundo arranque no imprime ni cambia la contraseña.

## Documentación

- [x] Actualizar `docs/diagrama-de-despliegue.md`, `docs/diagrama-de-base-de-datos.md` y `AGENTS.md` según el plan — cubre: sin contradicciones con el código — verificación: revisión.

## Verificación cruzada

- [x] `./mvnw test`, `./mvnw test -Dtest='*IT'` y prueba manual con `./scripts/dev.sh`: iniciar sesión con la cuenta de desarrollo en `/login` y confirmar rol `ADMINISTRADOR` en `GET /api/auth/me` (o el endpoint equivalente); arrancar con `SPRING_PROFILES_ACTIVE=prod` sin `APP_DEFAULT_ADMIN_PASSWORD` y confirmar que falla indicando la variable — cubre: todos los criterios de aceptación.
