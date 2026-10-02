# Spec: HT-09 — Configurar el entorno del proyecto

**Épica**: [E0. Fundamentos del proyecto](../../docs/epicas.md#e0)
**Estado**: Hecha (con una excepción anotada: MinIO no se pudo levantar en `docker-compose.dev.yml`, ver Casos borde)

## Objetivo

Dejar listo el proyecto base de backend y frontend — estructura de carpetas, build tool, librerías y base de datos de desarrollo — para que cualquier historia funcional (HU-xx) o técnica (HT-xx) se pueda implementar sin decisiones de arquitectura pendientes.

## Actor(es)

Equipo de desarrollo (historia técnica, sin usuario final).

## Criterios de aceptación

- **Dado** un clon nuevo del repositorio, **cuando** ejecuto `pnpm install` dentro de `frontend/`, **entonces** las dependencias se instalan sin errores y `pnpm dev` levanta la app en local.
- **Dado** un clon nuevo del repositorio con `docker-compose.dev.yml` corriendo, **cuando** ejecuto `./mvnw spring-boot:run` dentro de `backend/`, **entonces** la API levanta y Flyway aplica las migraciones iniciales (`users`, `refresh_tokens`, `password_reset_tokens`) sin errores.
- **Dado** el backend corriendo, **cuando** se implemente una historia nueva (ej. HU-01), **entonces** el desarrollador sabe en qué paquete crear cada clase, sin decidir la convención en cada historia (estructura por feature ya definida).
- **Dado** el frontend corriendo, **cuando** se agregue una pantalla nueva, **entonces** el desarrollador sabe en qué carpeta va y qué mecanismo de estado usar para sesión y carrito.
- **Dado** este spec y `AGENTS.md`, **cuando** se comparan, **entonces** no hay contradicciones sobre build tool, estructura de carpetas o librerías.

## Casos borde

- Un desarrollador sin Postgres/Redis/MinIO instalados localmente — `docker-compose.dev.yml` debe levantar los tres sin configuración adicional. **Verificado con una excepción**: Postgres y Redis levantan y el backend arranca y migra contra ellos sin problema (ni Flyway ni el arranque de la API tocan MinIO). El servicio `minio` del compose no pudo levantarse: Docker Hub y quay.io devuelven `pull access denied` para `minio/minio` — MinIO restringió la distribución de su imagen de contenedor (requiere cuenta/login). Queda pendiente decidirlo antes de implementar algo que dependa de MinIO (HU-08, HU-29): usar una cuenta de MinIO, construir la imagen desde fuente, o una alternativa (ej. un bucket S3 real en desarrollo).
- Variables de entorno sensibles (credenciales de BD, secreto JWT, llaves de Izipay/Google/SMTP) — nunca hardcodeadas; se cargan desde `.env` (ignorado por git) con un `.env.example` como referencia.

## Fuera de alcance

- CI/CD (pipelines de build/deploy automático).
- El `docker-compose` de producción del VPS (ya definido en `docs/diagrama-de-despliegue.md`); `docker-compose.dev.yml` es solo para desarrollo local.
- Tests end-to-end exhaustivos de toda la app.

## Decisiones de clarificación

- **Build tool backend**: Maven, con wrapper (`./mvnw`).
- **Organización de paquetes backend**: por feature/dominio (`auth`, `catalogo`, `carrito`, `pedidos`, `perfil`, `admin`, `common`), no por capa técnica.
- **Estado global del frontend**: Context API + hooks (sin librería externa de estado).
