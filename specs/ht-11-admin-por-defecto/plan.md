# Plan: HT-11 — Cuenta de administrador por defecto

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

- **Endpoints**: ninguno. La cuenta se usa con el login existente (`POST /api/auth/login`).
- **Capas**: solo Servicios en el paquete `auth`.
  - `DefaultAdminProperties` (record `@ConfigurationProperties("app.default-admin")`: `enabled`, `email`, `password`, `firstName`, `lastName`, `phone`).
  - `DefaultAdminInitializer` (`ApplicationRunner`, transaccional): si `enabled` y `!userRepository.existsByRole(ADMINISTRADOR)`, crea el `User` con `passwordEncoder.encode(...)`, `UserRole.ADMINISTRADOR` y `email_verified = true`. Sigue el patrón de `PasswordResetProperties` (`@EnableConfigurationProperties` en el componente).
  - `UserRepository`: agregar `existsByRole(UserRole role)`.
  - `User`: el constructor público existente fija `role`; agregar un método `markEmailVerified()` o un factory `User.administrator(...)` si el constructor no deja `email_verified = true`.
- **Reglas de arranque**:
  - Ya hay un administrador: no hace nada.
  - El correo ya lo usa un `CLIENTE`: advertencia en el log y no crea nada.
  - Perfil `prod` con correo o contraseña vacíos, o contraseña que no cumple `PasswordRules` (8+ caracteres, letras y números, máx. 72): lanza `IllegalStateException` con el nombre de la variable faltante y el arranque falla.
  - Otro perfil con contraseña vacía: advertencia y no crea nada.
  - `DataIntegrityViolationException` por `UNIQUE(email)` (carrera entre instancias): se trata como "ya existe".
- **Base de datos**: sin migración ni cambios de esquema. Usa `users` tal como está.
- **Configuración**:
  - `application.yml`: `app.default-admin.enabled: true`, `email: ${APP_DEFAULT_ADMIN_EMAIL:}`, `password: ${APP_DEFAULT_ADMIN_PASSWORD:}`, `first-name: ${APP_DEFAULT_ADMIN_FIRST_NAME:Administrador}`, `last-name: ${APP_DEFAULT_ADMIN_LAST_NAME:Salazar}`, `phone: ${APP_DEFAULT_ADMIN_PHONE:}`.
  - `application-dev.yml`: `app.default-admin.email: admin@cevicheria-salazar.com`.
  - `.env.example`: `APP_DEFAULT_ADMIN_EMAIL=` y `APP_DEFAULT_ADMIN_PASSWORD=` con comentario de uso.
  - `WithTestSecrets`: `app.default-admin.enabled=false` para no contaminar los `*IT` existentes; el IT nuevo lo reactiva.

## Frontend

- Sin cambios. El acceso al panel `/admin` es HU-28.

## Infraestructura de desarrollo

- `scripts/dev.sh`: agregar `APP_DEFAULT_ADMIN_*` a la sincronización de claves del `.env` existente, generar `APP_DEFAULT_ADMIN_PASSWORD` con `ensure_secret` (formato que cumpla la política, p. ej. `Adm$(openssl rand -hex 8)1`) e imprimir correo y contraseña la primera vez que se genera.

## Seguridad

- La contraseña se guarda solo con `PasswordEncoder` (mismo algoritmo del registro) y nunca se registra en logs; el log solo menciona el correo.
- Sin contraseña por defecto conocida en el repositorio ni en `prod`.
- No reactiva ni modifica cuentas existentes (desactivadas, con datos cambiados o con otro rol).

## Decisiones

- Criterio "ningún administrador" y no "ese correo no existe": evita recrear la cuenta base si el negocio cambia el correo.
- Perfil `prod` falla fuerte y `dev` omite con advertencia: en producción una cuenta de administrador inalcanzable es un error de despliegue; en desarrollo no debe impedir arrancar el backend sin `dev.sh`.
- `ApplicationRunner` y no migración Flyway: ver Decisiones de clarificación de la spec.

## Impacto en docs/

- `docs/diagrama-de-despliegue.md`: variables `APP_DEFAULT_ADMIN_EMAIL` y `APP_DEFAULT_ADMIN_PASSWORD` del backend en el VPS y la recomendación de cambiar la contraseña tras el primer acceso.
- `docs/diagrama-de-base-de-datos.md`: nota en `users.role` de que el primer administrador lo siembra el backend al arrancar (HT-11).
- `AGENTS.md`: mencionar en "Entorno de desarrollo local" que `dev.sh` genera la cuenta de administrador de desarrollo.
