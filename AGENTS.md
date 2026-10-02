# AGENTS.md — Salazar SAC (cevichería)

Instrucciones para agentes de IA que trabajen en este repositorio.

## Proyecto

App e-commerce de Salazar SAC: una tienda web para pedidos de comida (ceviches, chicharrones, bebidas) y un panel de administración en `/admin` para que el negocio gestione catálogo, pedidos y ventas.

El contexto funcional completo (actores, casos de uso, épicas e historias de usuario) está en `docs/`. Antes de implementar una funcionalidad, revisa `docs/epicas.md` y `docs/historias.md` y referencia el ID correspondiente (HU-xx para historias de usuario, HT-xx para historias técnicas) en commits y PRs.

## Estructura del repositorio

- `docs/` — documentación funcional y técnica: épicas, historias, cronograma y diagramas (casos de uso, arquitectura, despliegue, base de datos), cada uno en su `.md` junto a la imagen en `docs/images/`.
- `design-system/` — design system de la UI (tokens, componentes, assets). Fuente de verdad visual para el frontend.
- `frontend/` — app React (tienda + `/admin`). Por crear.
- `backend/` — API Spring Boot. Por crear.

## Stack

Definido en `docs/diagrama-de-arquitectura.md` y `docs/diagrama-de-despliegue.md`:

- **Frontend**: React (responsive), una sola app que sirve la tienda y el panel `/admin` según el rol del usuario autenticado. Gestor de paquetes: **pnpm**. Se despliega en Cloudflare Pages.
- **Backend**: **Spring Boot** (Java). Capas: Seguridad (Spring Security, JWT en cookies + OAuth2) → Controladores REST → Servicios (lógica de negocio) → Repositorios (Spring Data JPA).
- **Datos**: PostgreSQL (base de datos principal, ver `docs/diagrama-de-base-de-datos.md`), Redis (intentos de login y caché, en memoria, sin persistencia), MinIO (imágenes de platos, vía API S3).
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

Se asume Maven con wrapper; si el proyecto usa Gradle, usar `./gradlew` en su lugar.

```
./mvnw spring-boot:run
./mvnw test
```

## Convenciones

- Documentación (`.md`) en español.
- Nombres de archivo en minúsculas separadas por guiones, sin espacios (ej. `diagrama-de-arquitectura.md`, no `diagrama de arquitectura.md`).
- Cada diagrama en `docs/` vive junto a su imagen en `docs/images/` y su descripción conecta cada componente con las épicas/historias que soporta.
- Textos de interfaz en español, tuteando al cliente ("Tu pedido está listo"), sin emojis. Precios con formato `S/ 32.00`.

## Frontend y design system

El `design-system/` es la fuente de verdad visual — no inventar colores, tipografías ni espaciados fuera de lo que define:

- `design-system/tokens.json`: tokens de color, tipografía (Fredoka para títulos, Nunito para texto, vía Google Fonts), espaciado, radios y sombras.
- `design-system/components/bundle.css` + `components/<Componente>/README.md`: estilos y guías de uso de `Button`, `Card`, `Dialog`, `Input`, `Notification`.
- `design-system/assets/Notificaciones/`: íconos SVG de notificación.

Antes de construir una pantalla nueva, revisar si el componente/token necesario ya existe ahí. Ver `design-system/ORIGEN.md` para el enlace al Artifact original si hace falta sincronizar cambios.

## Backend

- Las integraciones con servicios externos (Google OAuth, Izipay, SMTP) van solo en la capa de **Servicios**, nunca en controladores ni se exponen al frontend.
- Los tokens de sesión y de recuperación de contraseña se almacenan con hash (`token_hash`), nunca en texto plano — ver `docs/diagrama-de-base-de-datos.md`.
- Redis no es fuente de verdad: solo intentos de login (anti fuerza bruta) y caché de lecturas frecuentes del catálogo. Los datos persistentes van en PostgreSQL o MinIO.

## Reglas

- Nunca commitear secretos (`.env`, credenciales, llaves de API).
- Si una implementación cambia la arquitectura, el despliegue o el modelo de datos, actualizar el `.md` correspondiente en `docs/` en el mismo cambio.
