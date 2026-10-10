# Plan: HT-10 — Almacenamiento de imágenes compatible con S3 (Garage)

`spec.md` en estado Clarificada.

## Backend

### Dependencias

- Quitar `io.minio:minio` y la propiedad `minio.version` del `pom.xml`.
- Agregar `software.amazon.awssdk:bom` en `dependencyManagement` y `software.amazon.awssdk:s3` (sin versión) en `dependencies`. Versión del BOM: la del spike, 2.55.14.

### Configuración

- **`StorageProperties`** (record `@ConfigurationProperties("app.storage")`): `endpoint`, `region`, `accessKey`, `secretKey`, `bucket`, `publicBaseUrl`. Reemplaza los `@Value` sueltos de `MinioConfig` y de `ImageUrlResolver`.
- **`StorageConfig`** (reemplaza `MinioConfig`, `common/config`): bean `S3Client` con los tres ajustes que exige Garage, cada uno con un comentario del porqué:
  ```java
  S3Client.builder()
      .endpointOverride(URI.create(properties.endpoint()))
      .region(Region.of(properties.region()))
      .credentialsProvider(StaticCredentialsProvider.create(
              AwsBasicCredentials.create(properties.accessKey(), properties.secretKey())))
      .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
      // Garage rejects the checksum headers the SDK sends by default since 2.30
      .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
      .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
      .build();
  ```
  Con un `@PreDestroy`/`destroyMethod` implícito (`close()`) el cliente se cierra con el contexto.
- **`application.yml`**: el bloque `app.minio` pasa a `app.storage`:
  ```yaml
  storage:
    endpoint: ${STORAGE_ENDPOINT:http://localhost:3900}
    region: ${STORAGE_REGION:garage}
    access-key: ${STORAGE_ACCESS_KEY:}
    secret-key: ${STORAGE_SECRET_KEY:}
    bucket: ${STORAGE_BUCKET:platos}
    # Browser-facing prefix; the bucket is not part of the path when served by Garage's web mode
    public-base-url: ${STORAGE_PUBLIC_BASE_URL:http://platos.web.garage.localhost:3902}
  ```
- **`ImageUrlResolver`**: recibe `StorageProperties` y devuelve `{publicBaseUrl sin "/" final}/{path sin "/" inicial}`. El bucket ya no interviene.
- **`.env.example`**: se reemplazan las `MINIO_*` por `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_BASE_URL` y `GARAGE_RPC_SECRET`; las tres secretas quedan vacías (las genera `dev.sh`).
- Comentario de `ProductImage.path` y `package-info` de `config`: "MinIO" pasa a "object storage".

### Base de datos

Sin migraciones. Cambia `db/dev/R__sample_products.sql` (solo desarrollo): todas las imágenes de ejemplo pasan a la ruta `seed/dish.jpg` y un `UPDATE` repetible reescribe las rutas antiguas.

## Infraestructura de desarrollo

### `docker-compose.dev.yml`

El servicio `minio` y el volumen `minio_dev_data` se reemplazan por:

```yaml
garage:
  image: dxflrs/garage:v1.0.1
  environment:
    GARAGE_RPC_SECRET: ${GARAGE_RPC_SECRET:?run ./scripts/dev.sh}
  ports:
    - "3900:3900"   # S3 API
    - "3902:3902"   # public web endpoint
  volumes:
    - ./docker/garage/garage.toml:/etc/garage.toml:ro
    - garage_dev_data:/var/lib/garage
```

`docker/garage/garage.toml` (commiteado, sin secretos: `rpc_secret` llega por `GARAGE_RPC_SECRET`): `replication_factor = 1`, `db_engine = "lmdb"`, `s3_region = "garage"`, `[s3_api] root_domain = ".s3.garage.localhost"`, `[s3_web] root_domain = ".web.garage.localhost"`, y el puerto de administración sin publicar.

### `scripts/garage-init.sh` (idempotente)

La imagen de Garage solo trae `/garage` (sin shell), por lo que el script corre en el host y llama `docker compose exec -T garage /garage ...`:

1. Espera a que `garage status` responda.
2. Si el nodo no tiene rol, `layout assign -z dc1 -c 1G <nodo>` y `layout apply --version <n+1>`.
3. Si la clave no existe (`key info`), `key import --yes -n dev <STORAGE_ACCESS_KEY> <STORAGE_SECRET_KEY>`.
4. Si el bucket no existe (`bucket info`), `bucket create platos`.
5. `bucket allow --read --write --owner platos --key dev` y `bucket website --allow platos` (ya idempotentes).
6. Sube `frontend/public/background.jpg` con `curl --aws-sigv4 "aws:amz:garage:s3"` a `seed/dish.jpg` (PUT idempotente).

### `scripts/dev.sh`

- Antes de levantar contenedores, crea `backend/.env` si falta y genera `GARAGE_RPC_SECRET`, `STORAGE_ACCESS_KEY` (`GK` + 24 hex) y `STORAGE_SECRET_KEY` (64 hex) cuando estén vacíos; además agrega al `.env` existente las claves `STORAGE_*` que le falten tomándolas de `.env.example`.
- Exporta `GARAGE_RPC_SECRET` para `docker compose`, levanta `postgres redis garage`, ejecuta `garage-init.sh` y detiene `garage` junto con los otros al salir.

## Pruebas

- **`StorageConfigTest`** (unitaria): el cliente construido usa path-style y checksums `WHEN_REQUIRED` (a través de la configuración del builder o de una petición simulada). Es la red de seguridad contra una actualización del SDK.
- **`StorageIT`** (Testcontainers, `*IT`): levanta `dxflrs/garage:v1.0.1`, lo inicializa con `execInContainer("/garage", ...)`, sube/lee/consulta/borra un objeto con el `S3Client` del contexto y descarga el mismo objeto sin credenciales por el puerto web con `Host: platos.web.garage.localhost`. Incluye una segunda comprobación con un alias de bucket de dominio completo (`media.test`) para el caso de producción.
- **`ImageUrlResolverTest`**, **`CatalogServiceTest`** y **`CatalogControllerIT`** se actualizan al formato `{base}/{path}`.

## Seguridad

- Ninguna credencial ni el `rpc_secret` se commitea; salen de `backend/.env` (ignorado por git) generado por `dev.sh`.
- El puerto de administración de Garage (`3903`) no se publica; solo el S3 (`3900`) y el web público (`3902`), ambos enlazados a localhost en desarrollo.
- El bucket expone lectura pública solo por el modo web; la API S3 anónima sigue respondiendo `403`.
- La clave de aplicación tiene permisos solo sobre el bucket de platos.

## Decisiones

- **SDK de AWS en vez de `io.minio`**: ata el código al protocolo S3 y no a un proveedor; el cliente de MinIO además no estaba usado por ninguna clase.
- **Script en el host en vez de servicio `garage-init`**: la imagen de Garage no trae shell.
- **Credenciales generadas, no fijas**: coherente con `APP_JWT_SECRET` y con la regla de no commitear secretos.
- **Una sola foto de ejemplo**: se reutiliza `frontend/public/background.jpg`, así no se duplica un asset ni se mantienen decenas de imágenes.
- **Sin cambios en el frontend**: la URL llega completa en `imageUrl`; el cambio de proveedor es invisible para la pantalla.

## Impacto en docs/

- `docs/diagrama-de-arquitectura.md` y `docs/diagrama-de-despliegue.md`: MinIO pasa a Garage (almacenamiento S3 de imágenes; Traefik enruta `media.cevicheria-salazar.com` al puerto web `:3902`; volumen `garage_data`; la API habla con él por S3 en `:3900`).
- `docs/diagrama-de-base-de-datos.md`: "MinIO" pasa a "almacenamiento de objetos" en `product_images`.
- `AGENTS.md`: stack, entorno local (ahora levanta Garage; se elimina la nota de que MinIO está bloqueado), reglas de backend.
- `specs/ht-09-entorno/spec.md`: se cierra la excepción de MinIO apuntando a esta historia.
- Las imágenes `docs/images/*.png` las actualiza quien mantiene los diagramas (fuera de este cambio).
