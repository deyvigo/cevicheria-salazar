# Plan: HU-37 — Gestionar las zonas de precio del delivery

`spec.md` en estado Clarificada.

## Base de datos y contenedor (PostGIS)

Las zonas son polígonos geográficos: se guardan como `geometry` de PostGIS para validarlos, indexarlos y, en la historia del cálculo del delivery, resolver "¿qué zona contiene esta dirección?" con `ST_Contains`. Eso obliga a cambiar la imagen de PostgreSQL, y es la **primera tarea** (ver `tasks.md`).

### Cambio de imagen

- **`docker/postgres/Dockerfile`**: `FROM postgres:16` + `postgresql-16-postgis-3` del repositorio PGDG que la imagen ya trae configurado. No se usa `postgis/postgis` porque esa imagen no publica build para arm64 (Apple Silicon). Al partir de `postgres:16`, la base de Debian y la `glibc` son las mismas que las del contenedor anterior.
- `docker-compose.dev.yml`: el servicio `postgres` se construye con ese Dockerfile (imagen `salazar-postgis:16`; mismo usuario, base y puerto; el servicio se sigue llamando `postgres`, así `scripts/dev.sh` y su `docker exec salazar-cevicheria-postgres-1` no cambian). El volumen pasa de `postgres_dev_data` a **`postgis_dev_data`**.
- `TestcontainersConfiguration`: construye la misma imagen con `ImageFromDockerfile` (Docker la cachea) y la declara compatible con `postgres`. Antes usaba `postgres:latest`; ahora queda fijada en la versión 16.

### Migración de los datos existentes (sin perderlos)

No se reutiliza el volumen viejo con la imagen nueva: si las dos imágenes llegaran a traer una `glibc` distinta, los índices de texto (por ejemplo `lower(name)`) quedarían invalidados en silencio. Aunque con este Dockerfile la `glibc` coincide, se hace un volcado lógico y una restauración, que reconstruye todos los índices y no depende de esa coincidencia. Procedimiento, empaquetado en `scripts/migrate-postgres-to-postgis.sh`:

1. Con el contenedor viejo en marcha, registrar la **línea base**: filas por tabla (`count(*)` de cada tabla de `public`) y las versiones de `flyway_schema_history`.
2. `pg_dump -Fc` dentro del contenedor viejo a un archivo **fuera del repositorio** (`~/salazar-backups/salazar_dev-<fecha>.dump`); comprobar que el archivo existe, pesa más de 0 y se lista con `pg_restore -l`. El script aborta si falla cualquiera de estas comprobaciones.
3. Detener el contenedor viejo **sin borrar** el volumen `postgres_dev_data`, que queda como respaldo intacto.
4. Levantar el contenedor PostGIS con el volumen nuevo `postgis_dev_data` y restaurar con `pg_restore --no-owner --exit-on-error`.
5. Comparar filas por tabla y `flyway_schema_history` contra la línea base; el script falla si algo difiere.
6. Arrancar el backend: Flyway aplica solo las migraciones nuevas (V8 y V9) sobre la base restaurada.
7. **Reversión**: volver `docker-compose.dev.yml` a `postgres:16` y `postgres_dev_data`; el volumen viejo no se tocó. Borrar `postgres_dev_data` solo cuando el usuario lo confirme tras comprobar la tienda y el panel.

Garage (imágenes) y Redis (en memoria) no se tocan: las imágenes viven en Garage y la base solo guarda sus claves.

Producción todavía no está desplegada: el procedimiento para el VPS no se documenta aquí; cuando exista el despliegue, el usuario de la base deberá poder ejecutar `CREATE EXTENSION postgis`.

### Migraciones Flyway

- **`V8__postgis.sql`**: `CREATE EXTENSION IF NOT EXISTS postgis;`. Separada de la tabla para que un fallo de permisos se vea como tal.
- **`V9__delivery_zones.sql`**:

  ```sql
  CREATE TABLE delivery_zones (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      price NUMERIC(4, 2) NOT NULL CHECK (price > 0),
      color VARCHAR(20) NOT NULL,
      area geometry(Polygon, 4326) NOT NULL CHECK (ST_IsValid(area)),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX uq_delivery_zones_name_lower ON delivery_zones (lower(name));
  CREATE INDEX idx_delivery_zones_area ON delivery_zones USING GIST (area);
  ```

  `NUMERIC(4, 2)` limita la tarifa a 99.99. El `CHECK (ST_IsValid(area))` es la red de seguridad contra polígonos que se cruzan o con área cero, además de la validación del servicio. SRID 4326 (WGS 84), el mismo sistema de latitud/longitud de `addresses`. Sin borrado lógico: eliminar es definitivo (spec).

## Backend

### Dependencias

- `org.hibernate.orm:hibernate-spatial` (versión gestionada por Spring Boot; si no resuelve, usar `${hibernate.version}`), que trae JTS (`org.locationtech.jts`). Hibernate sigue en `validate`.

### Endpoints (paquete `admin`)

Bajo `/api/admin/delivery-zones`, protegidos por el `AdminAccessInterceptor` existente: sin sesión `401`, Cliente `403`.

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /api/admin/delivery-zones` | — | `200` con `List<DeliveryZoneResponse>` (todas, sin paginar, por nombre ascendente) |
| `POST /api/admin/delivery-zones` | `DeliveryZoneRequest` | `201` con `DeliveryZoneResponse` |
| `PUT /api/admin/delivery-zones/{id}` | igual que `POST` | `200` con `DeliveryZoneResponse` |
| `DELETE /api/admin/delivery-zones/{id}` | — | `204` |

`DeliveryZoneRequest`: `{ name, price, color, active, coordinates }`, donde `coordinates` es una lista de `{ latitude, longitude }` (el anillo exterior **sin repetir** el primer vértice al final). `DeliveryZoneResponse`: `{ id, name, price, color, active, coordinates }`. El frontend nunca ve JTS ni GeoJSON; es el mismo vocabulario `latitude`/`longitude` de las direcciones.

**Validación (`DeliveryZoneRequest`)**: `name` `@NotBlank` `@Size(max = 60)` con `strip()` en el constructor compacto; `price` `@NotNull` `@DecimalMin("0.01")` `@DecimalMax("99.99")` `@Digits(integer = 2, fraction = 2)`; `color` debe ser un id de la paleta; `coordinates` `@Size(min = 3, max = 100)` con cada `latitude` en [-90, 90] y `longitude` en [-180, 180] (mismos rangos que `addresses`). Además, `ZoneAreaMapper` construye el polígono (JTS, `x = longitude`, `y = latitude`, SRID 4326, anillo cerrado automáticamente) y lo rechaza con la `FieldInvalidException` que ya existe (`400`, campo `coordinates`) si no es válido (`Polygon.isValid()`: aristas que se cruzan, vértices repetidos que lo degeneran) o tiene un área menor que un metro cuadrado (puntos alineados). `color` se valida con un `@Pattern` sobre los ids de la paleta.

**Reglas**
- Nombre repetido (sin distinguir mayúsculas) → `409` con `FieldConflictException("name", "Ya existe una zona con ese nombre.")`. En `PUT` se excluye la propia fila. Dos peticiones simultáneas: `saveAndFlush` captura `DataIntegrityViolationException` y la traduce al mismo `409` según la restricción violada (`uq_delivery_zones_name_lower`).
- `PUT` sin cambios efectivos responde `200` igual (idempotente).
- `DELETE`: `404` si no existe (`DeliveryZoneNotFoundException`); borra la fila. No hay restricciones de uso: ninguna otra tabla referencia las zonas todavía.
- Las zonas superpuestas se aceptan sin comprobación.
- Sin Redis: no hay lecturas frecuentes que cachear.

### Capas

- **`pedidos/DeliveryZone`** (entidad) y **`pedidos/DeliveryZoneRepository`**: el dominio del delivery pertenece a `pedidos` (la historia del cálculo del delivery lo consumirá desde ahí), igual que `Category` vive en `catalogo` aunque la gestione `admin`. `area` es `org.locationtech.jts.geom.Polygon` con `@JdbcTypeCode(SqlTypes.GEOMETRY)` y `@Column(columnDefinition = "geometry(Polygon,4326)")`. Repositorio: `existsByNameIgnoreCase`, `existsByNameIgnoreCaseAndIdNot` y `findAllOrdered()` (`order by lower(name), id`).
- **`admin/ZoneAreaMapper`**: convierte `List<Coordinate>` ↔ `Polygon` y valida la geometría.
- **`admin/AdminDeliveryZoneService`** (`@Transactional`): listar, crear, editar, eliminar y traducción de `DataIntegrityViolationException`.
- **`admin/AdminDeliveryZoneController`**: delgado; `dto/DeliveryZoneRequest`, `dto/DeliveryZoneResponse` y `dto/ZoneCoordinate` en `admin/dto`.
- **`common/exception`**: `DeliveryZoneNotFoundException` (`404`) con su handler en `ApiExceptionHandler`; el `400` del área reutiliza `FieldInvalidException`.
- **Seguridad**: sin cambios en `SecurityConfig` ni `AdminAccessInterceptor`.

## Frontend

### Rutas (`router.tsx`)

Se agrega `{ path: 'zonas-delivery', label: 'Zonas de delivery' }` a `ADMIN_SECTIONS` (aparece en la navegación vertical) y `/admin/zonas-delivery` renderiza `AdminDeliveryZonesPage`; el `map` del router excluye esa ruta, como `categorias` y `platos`.

### Pantallas y componentes (`features/admin/`)

- **`admin-delivery-zones-page.tsx`**: título "Zonas de delivery", botón "Agregar zona" (deshabilitado mientras hay un formulario abierto) y el layout: `grid` con el mapa a la izquierda y la columna a la derecha (`lg:grid-cols-[minmax(0,1fr)_22rem]`); bajo `lg` se apilan, mapa arriba (`h-[50svh]`) y columna debajo. Es dueña del estado de interacción (`hoveredId`, `selectedId`, solicitudes de encuadre y de scroll, el diálogo de eliminar) y del **borrador** del formulario (`draft`: zona en edición, puntos y color), porque el mapa dibuja lo que el formulario edita. La columna muestra una de tres cosas: el formulario (si hay borrador), el texto "Aún no tienes zonas de delivery" (sin zonas, sin botón propio) o la lista de tarjetas. Al abrir el formulario se quitan el resaltado y la selección; al editar se encuadra la zona. Estados: carga, error con "Reintentar", vacío y lista.
- **`components/zone-map.tsx`**: `MapContainer` con un `Polygon` por zona, ordenados por área descendente para que las más pequeñas se dibujen encima (Leaflet apila por orden de inserción) y sean clicables. Estilo por estado: normal, `hovered`, `selected`, e inactiva (punteado `dashArray` y menor `fillOpacity`). `eventHandlers`: `mouseover`/`mouseout` → `onHover`, `click` → `onSelect(id)` con `bubblingMouseEvents: false`; un `click` en el mapa vacío llama a `onSelect(null)`. **Modo dibujo** (prop `drawing`): las demás zonas se dibujan atenuadas con `interactive={false}` y sin handlers (por eso se remontan con otra `key`, ya que `interactive` solo se lee al crear la capa), la zona en edición no se dibuja como guardada, el clic en el mapa no deselecciona sino que lo atiende `ZoneDrawingLayer`. Un efecto sobre `focusRequest` hace `map.fitBounds(bounds, { padding, maxZoom: 17 })` cuando la zona existe en la lista (si aún no, espera a que llegue); encuadre inicial a todas las zonas. Si las teselas fallan, muestra el aviso (`MapErrorBoundary` + el mismo manejo de teselas que `LocationPicker`).
- **`components/zone-card.tsx`**: `Card` con muestra de color, nombre, tarifa (`S/ 8.00`), etiqueta "Inactiva" y botones "Editar" y "Eliminar". El cuerpo es un botón (`aria-pressed` según la selección) que selecciona; `onMouseEnter`/`onMouseLeave` y `onFocus`/`onBlur` actualizan `hoveredId`; el estilo resaltado y el seleccionado salen de las props.
- **`components/zone-list.tsx`**: contenedor con `overflow-y-auto` y una referencia por tarjeta. Al cambiar `selectedId` con origen `'map'`, si la tarjeta no está completa dentro del contenedor, hace `scrollTo` del **contenedor** (no `scrollIntoView`, que movería también la página) con `behavior: 'smooth'`, o `'auto'` si `prefers-reduced-motion`.
- **`components/zone-form.tsx`**: formulario (no diálogo) para agregar y editar (`zone` opcional) con `react-hook-form` + `zod` para nombre ≤ 60, tarifa (`Input`, `inputMode="decimal"`, > 0, ≤ 99.99, hasta 2 decimales) y `active` (`Switch` existente). El **color y los puntos son controlados por la página** (props `color`/`points` y `onColorChange`/`onPointsChange`), no por `react-hook-form`; la forma se valida aparte (mínimo 3 puntos, sin cruces). Botones "Deshacer", "Reiniciar", "Cancelar" y "Guardar"; "Guardar" deshabilitado sin cambios (campos, color o coordenadas), mientras envía o si el mapa falló. Error del servidor: nombre repetido bajo el campo; forma inválida o error genérico como alerta ("No pudimos guardar la zona, intenta de nuevo"). Éxito: avisa a la página, que cierra el formulario, selecciona la zona y notifica "Zona agregada" / "Zona actualizada".
- **`components/zone-drawing-layer.tsx`**: capa que va dentro del `MapContainer` de `ZoneMap` en modo dibujo: cada clic agrega un vértice; los vértices son marcadores arrastrables, el clic en un vértice lo quita (si quedan al menos 3), el punto medio de cada lado agrega uno al tocarlo. Dibuja una línea con 2 puntos y el polígono desde 3, con el color elegido.
- **`components/zone-color-picker.tsx`**: grupo de opciones (`role="radiogroup"`) con una muestra por color de la paleta; `aria-label` con el nombre del color.
- **`components/delete-zone-dialog.tsx`**: confirmación con el nombre; otro error "No pudimos eliminar la zona, intenta de nuevo"; éxito cierra, quita la selección si era esa zona y notifica "Zona eliminada".
- **`zone-colors.ts`**: mapa `id → nombre de variable CSS del design system` (`celeste` → `--celeste-700`, `naranja` → `--naranja-500`, `lima` → `--lima-800`, `aji` → `--aji-500`, `coral` → `--coral-800`, `grafito` → `--ink-muted`). Leaflet necesita un color de verdad, no una clase de Tailwind: se lee la variable con `getComputedStyle(document.documentElement)`, así que no se escribe ningún hexadecimal en el código. Las muestras de las tarjetas usan el mismo valor.
- **`zone-geometry.ts`**: `polygonArea` (fórmula del zapatero sobre lat/lng, solo para ordenar), `hasSelfIntersection` (cruce de segmentos) y `toLatLngs`. El servidor sigue siendo la validación definitiva.
- **`admin-delivery-zone-api.ts`** (`listDeliveryZones`, `createDeliveryZone`, `updateDeliveryZone`, `deleteDeliveryZone` con la instancia `api`), **`use-admin-delivery-zones.ts`** (`useQuery(['admin', 'delivery-zones'])`) y **`use-admin-delivery-zone-mutations.ts`** (tres mutaciones que, al éxito, invalidan `['admin', 'delivery-zones']`; sin actualización optimista).
- **`src/lib/map-config.ts`**: se mueve ahí `TILE_URL` (hoy dentro de `location-picker.tsx`) para compartirlo con los dos mapas nuevos.
- Design system: `Dialog`, `Card`, `Input`, `Button`, `Notification` y `Switch`; sin tokens nuevos.

## Seguridad

- La autorización vive en el servidor (`AdminAccessInterceptor`); el guard de `/admin` del frontend es solo UX.
- La geometría y la tarifa se validan en el servidor (Bean Validation, `ZoneAreaMapper`) y la base las respalda (`CHECK`, índice único): el frontend no es la única barrera. Las coordenadas llegan como números y se convierten a geometría con JTS, nunca se concatenan en SQL ni se aceptan como WKT/GeoJSON del cliente.
- El nombre se muestra como texto de React, sin HTML.
- El respaldo `.dump` contiene datos de desarrollo y quedan fuera del repositorio; no se commitea.

## Decisiones

- **PostGIS y no `NUMERIC[]`/JSON**: permite validar la geometría en la base, indexarla (GIST) y resolver la zona de una dirección con `ST_Contains` en la historia del cálculo del delivery, sin traer polígonos a memoria.
- **Volcado y restauración, no reutilizar el volumen**: evita el riesgo de índices corruptos por cambio de `glibc` y deja el volumen viejo como reversión.
- **Entidad en `pedidos`, gestión en `admin`**: sigue el patrón de `catalogo`/`admin` de HU-29 y HU-31.
- **Sin GeoJSON en la API**: `latitude`/`longitude` es el vocabulario que ya usan las direcciones; el mapeo a JTS ocurre en un solo lugar.
- **Orden de apilamiento por área en el cliente**: ninguna zona queda inaccesible aunque se superpongan; no necesita campo en la base.
- **Color como id de paleta**: acotado al design system (AGENTS.md prohíbe colores fuera de los tokens) y sin valores libres en la base.
- **Un formulario para agregar y editar, sin `PATCH`**: se envían siempre todos los campos, igual que HU-24 y HU-31.
- **Sin paginación**: se esperan pocas zonas; el panel muestra todas.
- **Formulario en la columna y dibujo en el mapa principal** (decidido tras probar la primera versión con un diálogo y mapa propio): el administrador ve las demás zonas a escala real mientras dibuja y no hay un segundo mapa que cargar; el coste es que las zonas guardadas se desactivan mientras dura el dibujo.
- **`active` se edita solo desde el formulario**: sin endpoint propio de activación.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: nueva tabla `delivery_zones` (columnas, índices, que `area` es `geometry(Polygon, 4326)`) y mención de la extensión PostGIS junto a `unaccent`. La imagen `docs/images/database-diagram.png` debe regenerarse con la tabla nueva (sin relaciones).
- `docs/diagrama-de-arquitectura.md`: PostgreSQL con PostGIS en la descripción de la base de datos.
- `AGENTS.md`: Stack ("PostgreSQL con PostGIS") y la descripción de `./scripts/dev.sh` (imagen y volumen nuevos).
- `docs/cronograma.md`: HU-37 ya figura en el Sprint 2, semana 1; marcarla como hecha al cerrar.
