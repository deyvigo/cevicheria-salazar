# Plan: HT-09 — Configurar el entorno del proyecto

`spec.md` en estado Clarificada.

## Estructura raíz del repositorio

```
salazar-cevicheria/
├── AGENTS.md
├── CLAUDE.md
├── docs/
├── design-system/
├── specs/
├── docker-compose.dev.yml   # Postgres + Redis + MinIO para desarrollo local
├── backend/
└── frontend/
```

`docker-compose.dev.yml` es solo para desarrollo local; no es el mismo `docker-compose` de producción del VPS (`docs/diagrama-de-despliegue.md`), que además incluye Traefik y Spring Boot ya empaquetado.

## Backend (`backend/`)

**Build tool**: Maven con wrapper (`./mvnw`). **Organización**: por feature/dominio, un paquete por épica funcional.

```
backend/
├── pom.xml
├── mvnw, mvnw.cmd, .mvn/
└── src/
    ├── main/
    │   ├── java/com/salazar/api/
    │   │   ├── SalazarApiApplication.java
    │   │   ├── auth/              # E1 — HU-01 a HU-06
    │   │   │   ├── AuthController.java
    │   │   │   ├── AuthService.java
    │   │   │   ├── User.java, RefreshToken.java, PasswordResetToken.java   (entidades)
    │   │   │   ├── UserRepository.java, RefreshTokenRepository.java, PasswordResetTokenRepository.java
    │   │   │   └── dto/           # RegisterRequest, LoginRequest, UserResponse...
    │   │   ├── catalogo/           # E2 — HU-07 a HU-11
    │   │   ├── carrito/            # E3 — HU-12 a HU-16, HU-35
    │   │   ├── pedidos/            # E4 — HU-17 a HU-22 (checkout y seguimiento)
    │   │   ├── perfil/             # E5 — HU-23 a HU-27
    │   │   ├── admin/              # E6 — HU-28 a HU-34 (reusa servicios de catalogo/pedidos con rol ADMIN)
    │   │   └── common/
    │   │       ├── security/      # SecurityConfig, JwtService, JwtAuthFilter, OAuth2SuccessHandler
    │   │       ├── config/        # MinioConfig, CorsConfig (Redis se autoconfigura, sin clase propia)
    │   │       └── exception/     # ApiExceptionHandler, ApiError (mapea validación→400, duplicado→409, etc.)
    │   └── resources/
    │       ├── application.yml, application-dev.yml, application-prod.yml
    │       └── db/migration/      # Flyway: V1__init_auth.sql, V2__..., etc.
    └── test/java/com/salazar/api/...   # un paquete de test por feature, igual que main
```

### Librerías / servicios (además de lo ya fijado en `docs/diagrama-de-arquitectura.md`)

- **Flyway**: migraciones versionadas de la base de datos (`db/migration/`). `ddl-auto=validate` en Hibernate — el esquema lo controla Flyway, nunca el auto-DDL de Hibernate.
- **Lombok**: reduce el boilerplate de entidades y DTOs (getters/setters/constructores).
- **springdoc-openapi**: genera la documentación OpenAPI/Swagger UI de la API, útil como contrato entre backend y frontend mientras no hay un cliente generado.
- **Testcontainers**: para los tests de integración que necesitan Postgres/Redis reales (ya previstos en `specs/hu-01-registro/tasks.md`), en vez de mocks o una base H2 que no refleja el comportamiento real de las restricciones únicas.

## Frontend (`frontend/`)

**Gestor de paquetes**: pnpm. **Bundler**: Vite (la app se despliega como artefacto estático en Cloudflare Pages, no necesita SSR). **Estado global**: Context API + hooks.

```
frontend/
├── package.json, pnpm-lock.yaml
├── vite.config.ts, vitest.config.ts
├── vitest.setup.ts      # config global de Vitest (jest-dom), a nivel de frontend/, no dentro de src/
├── index.html
├── public/
└── src/
    ├── main.tsx, App.tsx, router.tsx        # React Router
    ├── styles/
    │   ├── tokens.css           # variables CSS generadas desde design-system/tokens.json
    │   ├── tailwind-theme.css   # mapea esos tokens al namespace @theme de Tailwind
    │   └── global.css           # @import "tailwindcss" + tokens.css + tailwind-theme.css
    ├── lib/
    │   ├── api.ts           # instancia de axios (withCredentials: true para la cookie del JWT)
    │   └── queryClient.ts   # configuración de TanStack Query
    ├── context/
    │   ├── AuthContext.tsx  # usuario autenticado, login/logout
    │   └── CartContext.tsx  # carrito (persistido en localStorage, sin cuenta — HU-16)
    ├── features/
    │   ├── auth/            # RegisterPage, LoginPage, hooks y llamadas a /api/auth/*
    │   ├── catalogo/
    │   ├── carrito/
    │   ├── checkout/
    │   ├── perfil/
    │   └── admin/
    └── components/          # wrappers de Button/Input/Card/Dialog/Notification, con utilities de Tailwind
```

Los tests de cada componente/hook se colocan junto al archivo que prueban (ej. `App.test.tsx` al lado de `App.tsx`), no en un árbol de tests separado — solo la configuración global de Vitest (`vitest.setup.ts`) vive fuera de `src/`, porque es config de herramienta, no código de la app.

### Librerías / servicios

- **react-router-dom**: rutas de la tienda y de `/admin`.
- **axios**: cliente HTTP para todas las llamadas a la API (instancia única en `lib/api.ts` con `withCredentials: true`, para que la cookie `httpOnly` del JWT viaje en cada request).
- **@tanstack/react-query**: cache y estados de carga/error de las llamadas a la API, usando axios como función de fetch (complementa los Context, que solo guardan el estado derivado: usuario actual, items del carrito).
- **react-hook-form + zod**: manejo y validación de formularios en el cliente (ej. HU-01: campos obligatorios, formato de correo/teléfono, reglas de contraseña, coincidencia de confirmación), con reglas equivalentes a las del backend.
- **vitest + @testing-library/react**: tests de componentes y hooks.
- **Tailwind CSS v4** (`tailwindcss` + `@tailwindcss/vite`): estilos de toda la app, vía utilities. Configuración CSS-first (`@theme` en `tailwind-theme.css`), sin `tailwind.config.js`. Los tokens de `design-system/tokens.json` quedan expuestos como utilities (`bg-action`, `text-ink`, `rounded-lg`, `shadow-focus`, `font-display`, ...) en vez de vendorizar las clases `cv-*` de `design-system/components/bundle.css` — ese archivo queda solo como referencia visual (`preview.html`), no se copia.

### Alias de imports

`@/` apunta a `src/` (configurado en `vite.config.ts`, `vitest.config.ts` y `tsconfig.app.json` vía `compilerOptions.paths`, sin `baseUrl` porque `moduleResolution: "bundler"` no lo necesita). Todo import dentro de `src/` usa `@/...` en vez de rutas relativas (`../../lib/api`).

## `docker-compose.dev.yml` (servicios de desarrollo local)

- `postgres`: Postgres 16, puerto `5432`, volumen nombrado para persistir entre reinicios.
- `redis`: Redis 7, puerto `6379`, sin persistencia (igual que en producción).
- `minio`: puerto `9000` (API) y `9001` (consola), credenciales de desarrollo fijas en `.env`.

## Variables de entorno

- `backend/.env.example` y `frontend/.env.example` documentan las variables necesarias (credenciales de BD, secreto JWT, llaves de Izipay/Google/SMTP, URL de la API) sin valores reales.
- `.env` real queda en `.gitignore` (ya cubierto por la regla de "Reglas" de `AGENTS.md`: nunca commitear secretos).

## Decisiones

- Maven en vez de Gradle, por ser el estándar de Spring Initializr y reducir la curva de entrada a quien se una al proyecto.
- Paquetes por feature en el backend: cada historia de una épica toca mayormente un solo paquete, en vez de saltar entre `controller/`, `service/` y `repository/` como en la organización por capa.
- Vite en vez de Next.js: no hay necesidad de SSR — el diagrama de despliegue ya define el frontend como un artefacto estático servido por Cloudflare Pages.
- Context API en vez de Zustand/Redux: el alcance actual (sesión + carrito) no justifica una librería de estado adicional.
- axios en vez de `fetch` nativo: interceptores para manejar `401` de forma centralizada (ej. redirigir a login o refrescar el token) y una sintaxis más simple para enviar/leer JSON, consistente en toda la app.
- Tailwind CSS (a pedido explícito), reemplazando la vendorización inicial de `bundle.css`: evita mantener dos sistemas de clases en paralelo (`cv-*` y utilities) y es más fácil de componer en JSX. El `@theme` de `tailwind-theme.css` apunta a las mismas variables de `tokens.css`, así que sigue habiendo una sola fuente de verdad de valores.
- Alias `@/` en vez de imports relativos: evita cadenas `../../../` al mover archivos entre `features/`.

## Impacto en docs/

Ninguno: esta historia define cómo se organiza el código, no cambia la arquitectura, el despliegue ni el modelo de datos ya documentados.
