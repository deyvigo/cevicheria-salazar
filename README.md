# Salazar SAC — Cevichería

App e-commerce para Salazar SAC: una tienda web donde los clientes piden ceviches, chicharrones y bebidas, y un panel de administración en `/admin` donde el negocio gestiona el catálogo, los pedidos y las ventas.

## Qué incluye

- **Tienda**: carta por categorías, detalle y búsqueda de platos, carrito (sin necesidad de cuenta), checkout con dirección de entrega y costo de delivery según zona, perfil del cliente.
- **Autenticación**: registro, inicio de sesión con correo o Google, recuperación de contraseña.
- **Panel de administración**: gestión de platos, categorías y disponibilidad, zonas de delivery y datos personales.

Los actores, épicas e historias de usuario están en [`docs/`](docs/epicas.md).

## Stack

| Capa           | Tecnología                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| Frontend       | React + Vite, Tailwind CSS v4, Zustand, TanStack Query (pnpm)                  |
| Backend        | Spring Boot 4 (Java 21), Spring Security (JWT en cookies + OAuth2), Spring Data JPA, Flyway (Maven) |
| Datos          | PostgreSQL con PostGIS, Redis (intentos de login y caché), Garage (S3, imágenes) |
| Integraciones  | Google OAuth 2.0, Izipay, SMTP                                                 |
| Infraestructura | VPS con Docker Compose, Traefik (TLS con Let's Encrypt), Cloudflare Pages      |

## Estructura

```
backend/         API Spring Boot
frontend/        App React (tienda + /admin)
design-system/   Tokens y componentes visuales (fuente de verdad de la UI)
docs/            Épicas, historias, cronograma y diagramas
specs/           Especificaciones por historia (spec / plan / tasks)
scripts/         Utilidades de desarrollo
docker/          Imágenes propias (Postgres + PostGIS)
```

## Requisitos

- Docker (con Compose)
- Java 21
- Node.js y [pnpm](https://pnpm.io) (no usar `npm` ni `yarn`)

## Ejecutar en local

```
./scripts/dev.sh
```

El script:

1. Levanta Postgres (con PostGIS), Redis y Garage con `docker-compose.dev.yml`.
2. Genera `backend/.env` la primera vez (`APP_JWT_SECRET` y credenciales de Garage) e inicializa Garage (bucket `platos` e imágenes de ejemplo).
3. Crea la cuenta de administrador de desarrollo la primera vez y muestra sus credenciales **una sola vez** (quedan en `APP_DEFAULT_ADMIN_EMAIL` y `APP_DEFAULT_ADMIN_PASSWORD` en `backend/.env`).
4. Arranca backend y frontend y abre `/` en el navegador.

`Ctrl+C` detiene backend y frontend; Postgres, Redis y Garage siguen corriendo. Para bajarlos:

```
docker compose -f docker-compose.dev.yml down
```

### Opciones y notas

- `./scripts/dev.sh --lan` expone el frontend en la red local (ajusta CORS y `VITE_API_URL`) para probar desde un celular. Google OAuth no funciona en este modo: exige `localhost` o un dominio.
- Para el login con Google define `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET` en `backend/.env`.
- Las imágenes de los platos se sirven desde `http://platos.web.garage.localhost:3902/`; la API S3 de Garage está en `:3900`.
- Si tenías una base creada antes de PostGIS (volumen `postgres_dev_data`), migra sus datos una vez con `./scripts/migrate-postgres-to-postgis.sh`.

### Por separado

```
# Backend (backend/)
./mvnw spring-boot:run

# Frontend (frontend/)
pnpm install
pnpm dev
```

## Pruebas

```
# Backend: unitarias e integración (los *IT necesitan Docker)
cd backend
./mvnw test
./mvnw test -Dtest='*IT'

# Frontend
cd frontend
pnpm test --run
pnpm build
```

## Documentación

- [Épicas](docs/epicas.md) e [historias de usuario](docs/historias.md)
- [Cronograma](docs/cronograma.md)
- Diagramas: [casos de uso](docs/diagrama-de-casos-de-uso.md), [arquitectura](docs/diagrama-de-arquitectura.md), [despliegue](docs/diagrama-de-despliegue.md), [base de datos](docs/diagrama-de-base-de-datos.md)
- [Flujo de trabajo SDD](specs/README.md) y [guía para agentes de IA](AGENTS.md), con convenciones de código y de Git
