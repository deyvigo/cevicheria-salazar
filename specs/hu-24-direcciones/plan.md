# Plan: HU-24 — Ver, crear, editar y eliminar mis direcciones de entrega

`spec.md` en estado Clarificada.

## Backend

### Endpoints (paquete `perfil`)

Todos bajo `/api/perfil/direcciones`; el usuario sale siempre del `Authentication` (`userId`), nunca del cuerpo. Sin sesión `401`.

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /api/perfil/direcciones` | — | `200` con `AddressResponse[]` (solo activas, de la más reciente a la más antigua) |
| `POST /api/perfil/direcciones` | `{ label, address, reference?, latitude, longitude }` | `201` con `AddressResponse` |
| `PUT /api/perfil/direcciones/{id}` | igual que `POST` | `200` con `AddressResponse` |
| `DELETE /api/perfil/direcciones/{id}` | — | `204` |

`AddressResponse`: `{ id, label, address, reference, latitude, longitude }`. No expone `userId` ni `deletedAt`.

**Validación (`AddressRequest`)**: `label` `@NotBlank` `@Size(max = 40)`; `address` `@NotBlank` `@Size(max = 200)`; `reference` `@Size(max = 200)`; `latitude` y `longitude` `@NotNull` con `@DecimalMin`/`@DecimalMax` (-90..90 y -180..180). `trim` en el constructor compacto, como `UpdateProfileRequest`, y una `reference` que queda vacía pasa a `null`. El servidor redondea las coordenadas a 6 decimales (`setScale(6, HALF_UP)`, ~0.1 m) en vez de rechazar los que traen más, porque Leaflet entrega 15 o más.

**Reglas**
- Solo el rol `CLIENTE` (como `ProfileService`); un administrador recibe `403`.
- `PUT` y `DELETE` buscan por `id` **y** `userId` **y** `deletedAt is null`. Si no hay fila (inexistente, de otro cliente o ya eliminada) → `404` con el mismo mensaje en los tres casos, para no revelar si el id existe.
- `POST` cuenta las direcciones activas del cliente; con 10 → `409` ("Alcanzaste el máximo de 10 direcciones guardadas.").
- `DELETE` es lógico: `deletedAt = now()`; no hay `DELETE` SQL.

### Capas

- **`perfil/Address`** (entidad nueva): `id`, `userId`, `label`, `address`, `reference`, `latitude`, `longitude`, `deletedAt`, `createdAt`, `updatedAt`. Métodos `update(...)` (también actualiza `updatedAt`) y `markDeleted()`. Sin `@SQLRestriction`: el filtro de eliminadas es explícito en el repositorio, porque pedidos (E4) tendrá que poder cargar una dirección ya eliminada.
- **`perfil/AddressRepository`**: `findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc`, `findByIdAndUserIdAndDeletedAtIsNull`, `countByUserIdAndDeletedAtIsNull`.
- **`perfil/AddressService`** (`@Transactional`): crear, editar, eliminar y listar. Para que dos `POST` simultáneos no pasen el tope, bloquea la fila del usuario (`@Lock(PESSIMISTIC_WRITE)` en una consulta de `UserRepository`) antes de contar.
- **`perfil/AddressController`**: mismo patrón de `userId(authentication)` que `ProfileController`; el método se mueve a un helper compartido en el paquete para no duplicarlo.
- **`common/exception/AddressNotFoundException`** (`404`) y **`AddressLimitReachedException`** (`409`), con sus handlers en `ApiExceptionHandler`.
- **`SecurityConfig` / `JwtAuthFilter`**: sin cambios.

### Base de datos

Migración `V6__addresses.sql`:

```sql
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    label VARCHAR(40) NOT NULL,
    address VARCHAR(200) NOT NULL,
    reference VARCHAR(200),
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id_active ON addresses (user_id) WHERE deleted_at IS NULL;
```

La clave foránea no lleva `ON DELETE CASCADE`: las cuentas se desactivan (`users.is_active`), no se borran, y una dirección con pedidos no debe desaparecer en cascada. Hibernate sigue en `validate`.

## Frontend

### Dependencias

- `leaflet` y `react-leaflet` (con `@types/leaflet`), vía `pnpm add`. Leaflet es la sugerencia aceptada en la clarificación: sin API key.
- Teselas: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, configurable con `VITE_MAP_TILE_URL` (si el tráfico crece, el servidor de OSM no es apto para producción y se cambia a un proveedor sin tocar código). Atribución "© OpenStreetMap contributors" visible, como exige su política.

### Rutas (`router.tsx`)

Dentro del `ProfileLayout` existente se agrega, junto a `mi-informacion`:

```
mis-direcciones                 MyAddressesPage
```

y `profile-sections.ts` suma `{ path: 'mis-direcciones', label: 'Mis direcciones' }` (si `ProfileNav` usa un ícono fijo, el ícono pasa a ser un campo de la sección y se agrega uno de ubicación).

### Pantallas y componentes

- **`features/perfil/my-addresses-page.tsx`**: lista con `useAddresses()`. Estados: carga, error con "Reintentar", vacío ("Aún no tienes direcciones guardadas" con botón "Agregar dirección") y lista de `Card`s. "Agregar dirección" se deshabilita con aviso al llegar a 10. Administra qué diálogo está abierto (agregar, editar con su dirección, eliminar con su dirección).
- **`features/perfil/components/address-card.tsx`**: nombre, dirección, referencia opcional y botones "Editar" y "Eliminar".
- **`features/perfil/components/address-dialog.tsx`**: un solo diálogo para agregar y editar (`address` opcional). `react-hook-form` + `zod` (nombre ≤ 40 y dirección ≤ 200 obligatorios, referencia ≤ 200, `trim`); latitud y longitud son campos del formulario que escribe el mapa con `setValue(..., { shouldDirty: true })`, de modo que mover el marcador cuenta como cambio. Valores iniciales: los de la dirección, o vacíos y el Centro de Lima al agregar; `reset` al abrir. "Guardar" deshabilitado sin cambios al editar, mientras envía o si el mapa falló. Error de servidor: `fieldErrors` en su campo; si no, "No pudimos guardar la dirección, intenta de nuevo"; `409` muestra el mensaje del servidor. Éxito: cierra y `Notification` "Dirección agregada" / "Dirección actualizada".
- **`features/perfil/components/location-picker.tsx`**: mapa Leaflet (`MapContainer`, `TileLayer`, `Marker` arrastrable) con props `value: { latitude, longitude }` y `onChange`. Eventos `dragend` y `click` del mapa llaman a `onChange` con el punto a 6 decimales y mueven el marcador. El marcador es un `L.divIcon` con SVG en línea usando el color del token de acción: evita los íconos por defecto de Leaflet, que rompen con el empaquetado. Altura fija (`h-64`) y `role="application"` con `aria-label` descriptivo. Recentra el mapa cuando cambia `value` desde fuera (al reabrir con otra dirección).
- **Carga diferida**: el diálogo importa `location-picker` con `React.lazy`, así Leaflet y su CSS solo se descargan al abrir el diálogo. Un `ErrorBoundary` y un contador de teselas (si el primer `tileerror` llega antes que cualquier `tileload`) disparan el aviso "No pudimos cargar el mapa" con opción de reintentar; mientras tanto "Guardar" queda deshabilitado.
- **`features/perfil/components/delete-address-dialog.tsx`**: `Dialog` de confirmación con nombre y dirección; error "No pudimos eliminar la dirección, intenta de nuevo"; éxito cierra y notifica "Dirección eliminada".
- **`features/perfil/address-api.ts`**: `listAddresses`, `createAddress`, `updateAddress`, `deleteAddress` con la instancia `api`.
- **`features/perfil/use-addresses.ts`** y **`use-address-mutations.ts`**: `useQuery(['addresses'])` y tres mutaciones que invalidan esa clave al éxito. Sin actualización optimista: la lista es corta y así refleja la verdad del servidor.
- Design system: `Dialog`, `Card`, `Input`, `Button`, `Notification`. Sin tokens nuevos. El mapa no existe en el design system: se enmarca con `rounded-lg` y el borde de los tokens; es el único componente nuevo sin referencia visual.

## Seguridad

- La pertenencia se verifica en cada consulta (`userId` del JWT en el `WHERE`), nunca con un chequeo posterior; ajena, inexistente y eliminada responden igual (`404`).
- Rol `CLIENTE` exigido en el servicio; el guard del frontend es solo UX.
- Validación en el servidor aunque el frontend ya valide (rangos de coordenadas, largos); el texto se muestra siempre como texto de React, sin HTML.
- Las teselas se piden desde el navegador a un tercero (OSM), que ve la IP del cliente y la zona consultada, no el contenido de sus direcciones. Si se define una CSP, `img-src` debe permitir el host de teselas.

## Decisiones

- **Rutas anidadas bajo `/api/perfil`** y paquete `perfil`, porque las direcciones son parte del perfil (E5) y no del checkout.
- **Soft delete sin `@SQLRestriction`**: el filtro explícito deja a pedidos cargar direcciones eliminadas cuando exista E4; la spec delega a E4 guardar una copia de los datos de entrega, y este diseño no lo impide.
- **Redondeo a 6 decimales en el servidor**: evita rechazar coordenadas válidas por exceso de precisión.
- **Un diálogo para agregar y editar**: mismos campos y reglas; solo cambian los valores iniciales y el texto.
- **Sin `PATCH`**: el diálogo envía siempre los cinco campos (igual que HU-23).
- **Leaflet directo en el diálogo y cargado bajo demanda**: la tienda no necesita mapas en el resto de pantallas.
- **Pruebas del mapa**: jsdom no renderiza Leaflet de forma fiable, así que en los tests de `address-dialog` `location-picker` se reemplaza por un doble que expone botones para llamar a `onChange`; el mapa real se verifica en el navegador.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: agregar la tabla `addresses` (descripción y relación `users (1) — (N) addresses`) y actualizar la nota de que perfil aún no tiene tablas. La imagen `images/database-diagram.png` debe regenerarse con la nueva tabla.
- `docs/diagrama-de-arquitectura.md`: mencionar que el navegador consume teselas de OpenStreetMap como servicio externo (solo frontend), junto a los demás servicios externos.
- `docs/cronograma.md`: marcar HU-24 como hecha al cerrar.
- Casos de uso: ya incluye "Gestionar perfil" con HU-24; sin cambios.
