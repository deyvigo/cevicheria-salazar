# Spec: HT-10 — Almacenamiento de imágenes compatible con S3 (Garage)

**Épica**: [E0. Fundamentos del proyecto](../../docs/epicas.md#e0)
**Estado**: Hecha

## Objetivo

Que las imágenes de los platos tengan un almacenamiento de objetos que funcione igual en desarrollo y en producción, sin depender de la imagen de contenedor de MinIO (que dejó de poder descargarse), y que el backend lo use a través del protocolo S3 estándar y no de un cliente atado a un proveedor.

## Contexto (qué ya existe y qué falta)

- `docker-compose.dev.yml` define un servicio `minio`, pero `minio/minio` devuelve `pull access denied`; por eso `scripts/dev.sh` solo levanta Postgres y Redis (excepción anotada en `specs/ht-09-entorno/spec.md`).
- El backend declara el cliente `io.minio:minio` y un bean `MinioClient` en `MinioConfig`, que ninguna clase inyecta todavía.
- HU-07 ya construye las URLs públicas de imagen en `ImageUrlResolver` con el formato `{app.minio.public-url}/{bucket}/{path}`; en desarrollo siempre se ve la imagen de reemplazo porque no hay almacenamiento.
- Los diagramas y `AGENTS.md` nombran MinIO como componente.
- HU-08 (detalle con foto) y HU-29 (el administrador sube imágenes) dependen de este almacenamiento.

### Resultados del spike (probado en un contenedor local, `dxflrs/garage:v1.0.1`)

- La imagen se descarga sin login y un nodo único se inicializa con cinco comandos de CLI (layout, clave, bucket, modo web).
- El SDK `software.amazon.awssdk:s3` 2.55.14 funciona con **tres ajustes obligatorios**: región `garage`, acceso *path-style* y `requestChecksumCalculation`/`responseChecksumValidation` en `WHEN_REQUIRED`. Con los valores por defecto del SDK (checksums activados desde la 2.30) `putObject` falla con `Invalid content sha256 hash`.
- Operaciones verificadas con el SDK: `headBucket`, `putObject`, `headObject`, `getObject`, `listObjectsV2`, `deleteObject` y URL prefirmada.
- La lectura anónima por la API S3 (`:3900`) responde `403`. La lectura pública se hace con el **modo web** de Garage (`:3902`), que elige el bucket por el host (`platos.web.garage.localhost`), no por la ruta; devuelve `200` con `content-type` correcto y `404` si no existe.
- El cliente `io.minio` también funciona con `region("garage")`, pero se descarta por atar el código a un proveedor.

## Actor(es)

Equipo de desarrollo y quien opera el VPS (historia técnica, sin usuario final).

## Criterios de aceptación

- **Dado** un clon nuevo con Docker, **cuando** ejecuto `./scripts/dev.sh`, **entonces** además de Postgres y Redis se levanta Garage ya inicializado (nodo, clave, bucket de platos, modo web e imágenes de ejemplo), sin pasos manuales.
- **Dado** que Garage ya estaba inicializado, **cuando** reinicio el entorno de desarrollo, **entonces** la inicialización no falla ni duplica nada (es idempotente) y los objetos subidos siguen ahí (volumen persistente).
- **Dado** el backend corriendo, **cuando** una prueba sube un objeto al bucket de platos con el cliente del backend, **entonces** puede leerlo, consultarlo y borrarlo; y el mismo objeto se descarga sin credenciales desde la URL pública que arma `ImageUrlResolver`.
- **Dado** un plato cuya imagen existe en el almacenamiento, **cuando** abro su categoría en el frontend, **entonces** la tarjeta muestra esa imagen en lugar de la de reemplazo.
- **Dado** el repositorio, **cuando** reviso las dependencias del backend, **entonces** no queda `io.minio:minio` y las imágenes se gestionan con `software.amazon.awssdk:s3`.
- **Dado** `AGENTS.md`, los diagramas de arquitectura y despliegue y la spec de HT-09, **cuando** se comparan con el código, **entonces** ya no describen MinIO como componente y no hay contradicciones; la excepción de HT-09 queda cerrada.

## Casos borde

- Con los checksums del SDK en su valor por defecto, la subida falla con `400 Invalid content sha256 hash`: la configuración `WHEN_REQUIRED` debe estar cubierta por una prueba para que una actualización del SDK no la rompa en silencio.
- Garage necesita que el layout del nodo esté aplicado antes de aceptar escrituras; si la API arranca antes de la inicialización, la subida falla de forma confusa. La inicialización debe terminar antes de que se considere el entorno listo.
- La lectura pública depende de que el bucket tenga el modo web habilitado; sin él, las imágenes responden `404` aunque el objeto exista.
- El `rpc_secret` y las credenciales de la clave no se commitean: en desarrollo salen de `backend/.env` o de valores fijos solo para local, y en producción de variables del VPS.
- Un solo nodo con `replication_factor = 1` no tiene redundancia: la copia de seguridad del volumen queda como tarea de operación (ver `docs/diagrama-de-despliegue.md`).
- La advertencia de licencia (AGPLv3) aplica al servidor Garage, que corre como contenedor separado y no se enlaza con el backend.

## Fuera de alcance

- Subir imágenes desde la aplicación o el panel de administración (HU-29) y mostrar el detalle del plato (HU-08).
- Migrar objetos existentes: no hay ninguno en ningún entorno.
- CDN, redimensionado o formatos de imagen.
- Garage multinodo o replicación.
- Regenerar las imágenes de los diagramas (`docs/images/*.png`); la persona responsable las actualiza fuera del repositorio.

## Decisiones de clarificación

- **Versión de Garage**: fijada en `dxflrs/garage:v1.0.1` (la probada), no `latest`.
- **Formato de URL pública**: una sola propiedad `app.storage.public-base-url` con el prefijo completo (`http://platos.web.garage.localhost:3902` en desarrollo, `https://media.cevicheria-salazar.com` en producción). `ImageUrlResolver` solo concatena `{base}/{path}`; el bucket deja de formar parte de la URL.
- **Dominio en producción**: se mapea con un alias de bucket igual al dominio (`media.cevicheria-salazar.com`) y Traefik enruta ese host al puerto web de Garage. Se verifica localmente simulando el host; la verificación real queda para el despliegue.
- **Nombres de configuración**: `app.minio.*` pasa a `app.storage.*`, las variables `MINIO_*` a `STORAGE_*` y `MinioConfig` a `StorageConfig`. Quien tenga un `backend/.env` previo recibe las variables nuevas automáticamente al correr `./scripts/dev.sh`.
- **Inicialización en desarrollo**: un script idempotente (`scripts/garage-init.sh`) que `dev.sh` ejecuta con `docker compose exec` tras levantar Garage. Se descartó un servicio `garage-init` en el compose porque la imagen de Garage no trae shell (solo el binario `/garage`).
- **Credenciales**: ninguna se commitea. `dev.sh` genera `GARAGE_RPC_SECRET`, `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` en `backend/.env` la primera vez, igual que hace con `APP_JWT_SECRET`.
- **Imagen de ejemplo en desarrollo**: la foto `frontend/public/background.jpg` (la indicó el equipo), subida por el script de inicialización como `seed/dish.jpg`. El seed de HU-07 hace que todos los platos de ejemplo la referencien, en lugar de una imagen por plato.
- **SDK**: `software.amazon.awssdk:s3` gestionado con el BOM de AWS (`software.amazon.awssdk:bom`).
- **Diagramas**: este cambio actualiza los `.md`; las imágenes de `docs/images/*.png` las corrige quien mantiene los diagramas.
