# AGENTS.md — Salazar SAC (cevichería)

Instrucciones para agentes de IA que trabajen en este repositorio.

## Proyecto

App e-commerce de Salazar SAC: una tienda web para pedidos de comida (ceviches, chicharrones, bebidas) y un panel de administración en `/admin` para que el negocio gestione catálogo, pedidos y ventas.

El contexto funcional completo (actores, casos de uso, épicas e historias de usuario) está en `docs/`. Antes de implementar una funcionalidad, revisa `docs/epicas.md` y `docs/historias.md` y referencia el ID correspondiente (HU-xx para historias de usuario, HT-xx para historias técnicas) en commits y PRs.

## Estructura del repositorio

- `docs/` — documentación funcional y técnica: épicas, historias, cronograma y diagramas (casos de uso, arquitectura, despliegue, base de datos), cada uno en su `.md` junto a la imagen en `docs/images/`.
- `specs/` — especificaciones SDD por historia (spec/plan/tasks), ver [Flujo de trabajo (SDD)](#flujo-de-trabajo-sdd).
- `design-system/` — design system de la UI (tokens, componentes, assets). Fuente de verdad visual para el frontend.
- `frontend/` — app React (tienda + `/admin`). Por crear.
- `backend/` — API Spring Boot. Por crear.

## Stack

Definido en `docs/diagrama-de-arquitectura.md` y `docs/diagrama-de-despliegue.md`:

- **Frontend**: React (responsive), una sola app que sirve la tienda y el panel `/admin` según el rol del usuario autenticado. Gestor de paquetes: **pnpm**. Se despliega en Cloudflare Pages.
- **Backend**: **Spring Boot** (Java). Capas: Seguridad (Spring Security, JWT en cookies + OAuth2) → Controladores REST → Servicios (lógica de negocio) → Repositorios (Spring Data JPA).
- **Datos**: PostgreSQL (base de datos principal, ver `docs/diagrama-de-base-de-datos.md`), Redis (intentos de login y caché, en memoria, sin persistencia), Garage (almacenamiento de objetos compatible con S3 para las imágenes de platos; el backend lo usa con el SDK de AWS S3, ver `specs/ht-10-almacenamiento/`).
- **Servicios externos**: Google OAuth 2.0 (login social), Izipay (pasarela de pagos), servidor SMTP (correos y confirmaciones).
- **Infraestructura**: VPS con Docker Compose, Traefik como proxy inverso (TLS con Let's Encrypt).

## Comandos

### Frontend (`frontend/`)

Usar siempre **pnpm**, nunca `npm` ni `yarn`:

```
pnpm install
pnpm dev
pnpm build
pnpm test
```

### Backend (`backend/`)

Build tool: **Maven** con wrapper.

```
./mvnw spring-boot:run
./mvnw test
```

### Entorno de desarrollo local

```
./scripts/dev.sh
```

Levanta Postgres, Redis y Garage (`docker-compose.dev.yml`), genera `backend/.env` con `APP_JWT_SECRET` y las credenciales de Garage (`GARAGE_RPC_SECRET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`) la primera vez, inicializa Garage (`scripts/garage-init.sh`: nodo, clave, bucket `platos` e imágenes de ejemplo), arranca el backend y el frontend, y abre `/` en el navegador. Con `./scripts/dev.sh --lan` el frontend escucha en `0.0.0.0`, ajusta CORS y `VITE_API_URL` a la IP de la red local e imprime la URL para abrirla desde un celular en la misma red (Google OAuth no funciona así: exige `localhost` o dominio). Ctrl+C detiene backend y frontend; Postgres/Redis/Garage quedan corriendo (`docker compose -f docker-compose.dev.yml down` para bajarlos).

Las imágenes de los platos se sirven desde Garage en `http://platos.web.garage.localhost:3902/` (`*.localhost` resuelve a la máquina local sin tocar `/etc/hosts`); la API S3 está en `:3900`. No se usa MinIO: su imagen dejó de poder descargarse (ver `specs/ht-10-almacenamiento/spec.md`). No confundir `docker-compose.dev.yml` con el `docker-compose` de producción del VPS (`docs/diagrama-de-despliegue.md`).

## Convenciones

- Documentación (`.md`) en español.
- Nombres de archivo en minúsculas separadas por guiones, sin espacios (ej. `diagrama-de-arquitectura.md`, no `diagrama de arquitectura.md`).
- Cada diagrama en `docs/` vive junto a su imagen en `docs/images/` y su descripción conecta cada componente con las épicas/historias que soporta.
- Textos de interfaz en español, tuteando al cliente ("Tu pedido está listo"), sin emojis. Precios con formato `S/ 32.00`.
- **Comentarios en el código** (frontend, backend, scripts, YAML): solo los estrictamente necesarios, es decir, los que explican un porqué que no se ve en el código (restricción, caso borde, decisión no obvia). No comentar lo que el código ya dice, ni encabezados de sección, ni referencias a historias (HU-xx) o `specs/`. Todo comentario va en **inglés**, aunque la documentación y los textos de interfaz estén en español.
- **Nombres de archivos de código del frontend** (`.ts`, `.tsx`) en minúsculas separadas por guiones (kebab-case): `auth-shell.tsx`, `login-page.tsx`, `auth-api.ts`, `login-page.test.tsx`. Nunca PascalCase ni camelCase en el nombre del archivo (los componentes y funciones dentro sí siguen su convención normal).

## Frontend y design system

El `design-system/` es la fuente de verdad visual — no inventar colores, tipografías ni espaciados fuera de lo que define:

- `design-system/tokens.json`: tokens de color, tipografía (Fredoka para títulos, Nunito para texto, vía Google Fonts), espaciado, radios y sombras.
- `design-system/components/<Componente>/README.md` + `preview.html`: guías de uso y referencia visual de `Button`, `Card`, `Dialog`, `Input`, `Notification` — el aspecto a replicar, no el CSS a copiar (ver Frontend).
- `design-system/assets/Notificaciones/`: íconos SVG de notificación.

Antes de construir una pantalla nueva, revisar si el componente/token necesario ya existe ahí. Ver `design-system/ORIGEN.md` para el enlace al Artifact original si hace falta sincronizar cambios.

## Backend

- **Paquetes por feature/dominio**, no por capa técnica: `auth`, `catalogo`, `carrito`, `pedidos`, `perfil`, `admin` y `common` (`security`, `config`, `exception`). Cada historia de una épica toca mayormente un solo paquete. Detalle completo en [`specs/ht-09-entorno/plan.md`](specs/ht-09-entorno/plan.md).
- Migraciones de base de datos con **Flyway** (`src/main/resources/db/migration/`); Hibernate en modo `validate`, nunca autogenera el esquema.
- Las integraciones con servicios externos (Google OAuth, Izipay, SMTP) van solo en la capa de **Servicios**, nunca en controladores ni se exponen al frontend.
- Los tokens de sesión y de recuperación de contraseña se almacenan con hash (`token_hash`), nunca en texto plano — ver `docs/diagrama-de-base-de-datos.md`.
- Redis no es fuente de verdad: solo intentos de login (anti fuerza bruta) y caché de lecturas frecuentes del catálogo. Los datos persistentes van en PostgreSQL o en el almacenamiento de objetos (Garage).

## Frontend

- **Estilos**: **Tailwind CSS** (v4, CSS-first con `@theme`, sin `tailwind.config.js`). Los tokens de `design-system/tokens.json` están expuestos como utilities (`bg-action`, `text-ink`, `rounded-lg`, `font-display`, etc.) vía `src/styles/tailwind-theme.css` — nunca usar un color/radio/sombra fuera de esas utilities. El espaciado usa la escala por defecto de Tailwind (ya coincide con la del design system). No copiar las clases `cv-*` de `design-system/components/bundle.css`: ese archivo es solo referencia visual, no se vendoriza.
- **Archivos**: nombres en kebab-case (`auth-shell.tsx`, no `AuthShell.tsx`); ver [Convenciones](#convenciones).
- **Componentes por feature**: si una feature necesita componentes que solo ella usa, van en `src/features/<feature>/components/` (ej. `features/auth/components/auth-shell.tsx`). Los reutilizables entre features siguen en `src/components/`. Crear la carpeta solo cuando haga falta.
- **Tests**: en `frontend/tests/`, árbol independiente que replica la estructura de `src/` (`tests/components/header.test.tsx` prueba `src/components/header.tsx`); nunca junto al código fuente. Helpers compartidos en `tests/utils/` y setup global en `tests/setup.ts`. Alias `@tests/` → `tests/`.
- **Imports**: alias `@/` → `src/` (configurado en `vite.config.ts`, `vitest.config.ts` y `tsconfig.app.json`). Usar `@/...` en vez de rutas relativas (`../../lib/api`) para cualquier import dentro de `src/`.
- **Estado global**: Context API + hooks (`AuthContext`, `CartContext`) — sin librería externa de estado.
- Carpetas por feature en `src/features/` (`auth`, `catalogo`, `carrito`, `checkout`, `perfil`, `admin`). Detalle completo en [`specs/ht-09-entorno/plan.md`](specs/ht-09-entorno/plan.md).
- Formularios con `react-hook-form` + `zod`; llamadas a la API con **axios** (instancia única en `lib/api.ts`, `withCredentials: true`) + `@tanstack/react-query` para el cache.

## Flujo de trabajo (SDD)

Este proyecto usa Spec-Driven Development: ver [`specs/README.md`](specs/README.md) para el flujo completo (especificar → clarificar → planificar → tareas → implementar → verificar).

- No implementar una historia sin que su `specs/<historia>/spec.md` esté en estado Clarificada (sin preguntas abiertas).
- Si la implementación obliga a desviarse del `plan.md` o descubre un criterio nuevo, actualizar la spec en el mismo cambio, no después.

## Flujo de Git

Git flow con ramas creadas a mano (sin la extensión `git-flow`) y commits en formato Conventional Commits. **Leer esta sección antes de crear ramas o hacer cualquier commit.** No hacer commit, push ni abrir PR hasta que el usuario lo pida.

- **Ramas**:
  - `main`: solo lo publicado en producción.
  - `develop`: integración, base de todo el trabajo.
  - `feature/HU-XX-short-name` (o `feature/HT-XX-...`), igual que la carpeta en `specs/`: se crea desde `develop` y su PR va contra `develop`. Cambios sin historia: `feature/<short-name>`. El nombre de la rama va en inglés (ej. `feature/code-conventions`); solo el ID de la historia (`HU-XX`) se conserva tal cual, y si lleva descripción corta también va en inglés (ej. `feature/HU-05-sign-out`).
  - `release/x.y.z`: desde `develop`; se integra en `main` con tag `vx.y.z` y vuelve a `develop`.
  - `hotfix/<short-name>`: desde `main`; se integra en `main` (con tag) y en `develop`.
- **Mensajes de commit** (Conventional Commits, **en inglés**): `<type>(<scope>): <description>`.
  - Título y cuerpo en inglés, en imperativo y con minúscula inicial; el ID de la historia va al final del título si aplica. El detalle va en el cuerpo (`-m` adicional).
  - Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, `chore`.
  - Scopes: `backend`, `frontend`, `specs`, `docs`, `infra`.
  - Cambio incompatible: `!` tras el tipo y `BREAKING CHANGE:` en el cuerpo.
- **Commits segmentados por contenido**, en este orden, cada uno con su código y sus tests:
  1. Spec: `specs/<historia>/` completo (spec, plan y tareas, con el estado y las tareas ya actualizados). Mensaje: `docs(specs): add spec, plan and tasks for HU-XX`.
  2. Backend: `feat(backend): implement ... (HU-XX)`.
  3. Frontend: `feat(frontend): add ... (HU-XX)`.
     Omitir el segmento que la historia no toque. Usar `fix`, `refactor`, etc. cuando corresponda.
- **Antes de commitear**: `./mvnw test` y `./mvnw test -Dtest='*IT'` (los `*IT` no corren en el build por defecto y necesitan Docker), `pnpm test --run` y `pnpm build`.
- **Push y PR**: `git push -u origin <rama>` y PR contra `develop`, con título y cuerpo en inglés: título igual al commit principal, cuerpo con Summary y Verification (qué se probó y qué falta ver en navegador). Si `gh` no está instalado, dar el enlace `https://github.com/deyvigo/cevicheria-salazar/compare/develop...<rama>` con título y descripción listos para pegar. El merge lo hace el usuario.
- **Tras el merge**: `git checkout develop`, `git pull origin develop`, borrar la rama local (`git branch -d`) y la remota (`git push origin --delete <rama>`), solo si el usuario lo confirma.

## Reglas

- Nunca commitear secretos (`.env`, credenciales, llaves de API).
- Si una implementación cambia la arquitectura, el despliegue o el modelo de datos, actualizar el `.md` correspondiente en `docs/` en el mismo cambio.
