# Tareas: HT-10 — Almacenamiento de imágenes compatible con S3 (Garage)

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: dependencias y configuración

- [x] Reemplazar `io.minio:minio` por `software.amazon.awssdk:s3` gestionado con el BOM de AWS en `pom.xml` — cubre: no queda `io.minio` — verificación: `./mvnw dependency:tree` no lista `io.minio`; `./mvnw test` compila.
- [x] Crear `StorageProperties` y `StorageConfig` (bean `S3Client` con región, path-style y checksums `WHEN_REQUIRED`) y eliminar `MinioConfig`; renombrar `app.minio.*` a `app.storage.*` en `application.yml` — cubre: backend usa el SDK de S3 — verificación: `StorageConfigTest` — el cliente se construye con path-style y checksums `WHEN_REQUIRED` y apunta al endpoint configurado.
- [x] Adaptar `ImageUrlResolver` al formato `{public-base-url}/{path}` y actualizar sus tests y los de HU-07 que esperaban `{url}/{bucket}/{path}` — cubre: imagen visible desde la URL pública — verificación: `ImageUrlResolverTest`, `CatalogServiceTest` y `CatalogControllerIT` — sin dobles barras, sin bucket en la ruta.
- [x] Actualizar `.env.example` (`STORAGE_*`, `GARAGE_RPC_SECRET`), el comentario de `ProductImage.path` y el `package-info` de `config` — cubre: sin referencias a MinIO en el código — verificación: `git grep -i minio -- backend` sin resultados.

## Infraestructura de desarrollo

- [x] Crear `docker/garage/garage.toml` y reemplazar el servicio `minio` por `garage` (imagen fijada en `v1.0.1`, volumen `garage_dev_data`, puertos 3900 y 3902) en `docker-compose.dev.yml` — cubre: Garage en el entorno de desarrollo, datos persistentes — verificación: `docker compose -f docker-compose.dev.yml up -d garage` queda `Up`; tras `down` y `up` el objeto subido sigue ahí.
- [x] Crear `scripts/garage-init.sh` idempotente, que sube `frontend/public/background.jpg` como imagen de ejemplo — cubre: inicialización sin pasos manuales, idempotencia, imágenes de ejemplo — verificación: correrlo dos veces seguidas termina sin error, deja un solo bucket y una sola clave, y `curl` a `http://platos.web.garage.localhost:3902/seed/dish.jpg` devuelve `200` con `content-type: image/jpeg`.
- [x] Actualizar `scripts/dev.sh`: generar `GARAGE_RPC_SECRET`, `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` si faltan, agregar al `.env` existente las claves `STORAGE_*` ausentes, levantar `garage`, ejecutar `garage-init.sh` y detenerlo al salir — cubre: `dev.sh` deja todo listo — verificación: desde un `backend/.env` previo con `MINIO_*` y desde uno borrado, `./scripts/dev.sh` arranca el backend sin intervención.
- [x] Cambiar el seed de dev (`R__sample_products.sql`) a `seed/dish.jpg` con el `UPDATE` de las rutas antiguas — cubre: tarjetas con foto en desarrollo — verificación: en `/ceviches` las tarjetas muestran la foto de ejemplo y no la de reemplazo.

## Pruebas de integración

- [x] Crear `StorageIT` con Garage en Testcontainers: subir, consultar, leer y borrar un objeto con el `S3Client` del contexto, y descargarlo sin credenciales por el puerto web con `Host: platos.web.garage.localhost`; repetir con un alias de dominio completo (`media.test`) — cubre: operaciones con el cliente del backend, lectura pública, mapeo de dominio de producción — verificación: `./mvnw test -Dtest='StorageIT'`.

## Documentación

- [x] Reemplazar MinIO por Garage en `docs/diagrama-de-arquitectura.md` y `docs/diagrama-de-despliegue.md` (almacenamiento S3 de imágenes, ruta de Traefik al puerto web, volumen `garage_data`) y en `docs/diagrama-de-base-de-datos.md` — cubre: sin contradicciones con el código — verificación: `git grep -i minio -- docs` solo encuentra menciones históricas explícitas, ninguna como componente actual.
- [x] Actualizar `AGENTS.md` (stack, entorno local sin la nota de MinIO bloqueado, reglas de backend) y cerrar la excepción en `specs/ht-09-entorno/spec.md` — cubre: sin contradicciones, excepción de HT-09 cerrada — verificación: revisión.

## Verificación cruzada

- [x] Prueba en navegador (`./scripts/dev.sh`): las tarjetas de `/ceviches` muestran la imagen de ejemplo; detener y volver a levantar el entorno conserva las imágenes; borrar `backend/.env` y repetir deja todo funcionando — cubre: criterios de aceptación de entorno y de imagen visible.
- [x] Antes de commitear: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`.
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final y marcar la spec como **Hecha**.
