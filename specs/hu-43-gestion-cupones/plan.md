# Plan: HU-43 — Gestionar los códigos de descuento desde el panel

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

### Endpoints (`/api/admin/coupons`, rol `ADMINISTRADOR`)

| Método | Ruta                          | Request                | Response                          |
| ------ | ----------------------------- | ---------------------- | --------------------------------- |
| GET    | `/api/admin/coupons`          | —                      | `AdminCouponResponse[]`, más nuevos primero |
| POST   | `/api/admin/coupons`          | `CouponRequest`        | `201` + `AdminCouponResponse`     |
| PUT    | `/api/admin/coupons/{id}`     | `CouponRequest`        | `AdminCouponResponse`             |
| PATCH  | `/api/admin/coupons/{id}/active` | `{ "active": bool }` | `AdminCouponResponse`             |
| DELETE | `/api/admin/coupons/{id}`     | —                      | `204`                             |

- `CouponRequest` (record con Bean Validation, normaliza en el constructor como `CategoryRequest`):
  - `code`: obligatorio, máx. 30, solo `A-Z`, `0-9`, `-` y `_` (se valida ya normalizado), se guarda con `strip()` y en mayúsculas (`Locale.ROOT`). Mismo `normalize` que `CouponService` para que panel y checkout comparen igual.
  - `discountType` (`PERCENTAGE` | `FIXED`) y `discountValue` (> 0, máx. 2 decimales); con `PERCENTAGE`, ≤ 100 (validación de clase o en el servicio con `FieldInvalidException("discountValue", …)`).
  - `minSubtotal` (opcional, > 0), `maxUses` y `maxUsesPerCustomer` (opcionales, enteros > 0).
  - `startsOn` / `endsOn` (opcionales, `LocalDate`); si están los dos, `startsOn <= endsOn` (error en `endsOn`).
  - `active` (obligatorio).
- `AdminCouponResponse`: los mismos campos más `id`, `uses` (pedidos que ocupan cupo, regla de HU-42), `hasOrders` (algún pedido lo referencia, en cualquier estado), `exhausted` (`maxUses != null && uses >= maxUses`) y `expired` (`endsAt <= now`).
- **Vigencia en días de Lima**: el panel trabaja con fechas; el servidor guarda `starts_at = startsOn 00:00 America/Lima` y `ends_at = (endsOn + 1 día) 00:00 America/Lima`. Como el checkout trata `ends_at` como exclusivo (`now < ends_at`), el día de fin vale completo y un cupón de un solo día (`startsOn = endsOn`) cumple el `CHECK (starts_at < ends_at)`. La respuesta convierte de vuelta (`endsOn = ends_at − 1 día` en Lima).

### Capas

- **Controlador** `admin/AdminCouponController` y **servicio** `admin/AdminCouponService`, como `AdminCategoryController`/`Service`. Usa `pedidos.CouponRepository` (igual que el servicio de categorías usa repositorios de `catalogo`).
- **Entidad** `pedidos.Coupon`: agregar `update(...)` (todos los campos editables) y `setActive(boolean)`; sin setters sueltos.
- **Repositorio** `CouponRepository`:
  - `findByIdForUpdate(id)` con `PESSIMISTIC_WRITE`: editar, cambiar el estado y eliminar bloquean la fila igual que la creación de pedidos (`findByCodeForUpdate`), así un pedido simultáneo y un cambio de cupos o de código no se cruzan.
  - Una consulta nativa para la tabla: por cupón, `uses` (`count` filtrado por `PENDIENTE_PAGO`, `PENDIENTE_COBRO`, `PAGADO`) y `hasOrders` (`count(o.id) > 0`) con `LEFT JOIN orders`, agrupada por cupón; se combina con los cupones por `id`.
  - `existsByCodeAndIdNot` / `existsByCode` y `hasOrders(couponId)` (`SELECT EXISTS(...)`).
- **Reglas en el servicio**:
  - Código repetido → `FieldConflictException("code", "Ya existe un cupón con este código.")` (`409`); la restricción `UNIQUE` decide en una carrera, igual que categorías.
  - Cambiar el código con `hasOrders` → `FieldInvalidException("code", "El código no se puede cambiar porque ya se usó.")`.
  - `maxUses < uses` → `FieldInvalidException("maxUses", "Ya se usó N veces: los cupos no pueden ser menos.")`.
  - Eliminar con `hasOrders` → `CouponInUseException` (`409`, "Tiene pedidos asociados: desactívalo en su lugar."); la clave foránea `orders.coupon_id` es la última defensa (`DataIntegrityViolationException` → la misma excepción).
  - Cupón inexistente → `CouponNotFoundException` (`404`). Ambas excepciones nuevas en `common/exception` y en `ApiExceptionHandler`.
- **Seguridad**: la ruta queda bajo `/api/admin/**`, protegida por `AdminAccessInterceptor` (HU-28); no hay cambios de configuración.
- **Base de datos**: sin migración; la tabla `coupons` de `V20__coupons.sql` ya tiene todos los campos.

## Frontend

- **Navegación**: `admin-sections.ts` agrega `{ path: 'cupones', label: 'Cupones' }` entre `pedidos` y `reportes`; ruta `/admin/cupones` en `router.tsx`.
- **Datos**: `admin-coupon-api.ts` (tipos y llamadas con la instancia `api`), `use-admin-coupons.ts` (`useQuery`, clave `['admin', 'coupons']`, como categorías) y `use-admin-coupon-mutations.ts` (crear, editar, cambiar estado y eliminar; invalidan la lista). El interruptor actualiza de forma optimista y revierte con `Notification` si falla, como el interruptor de platos.
- **Pantalla** `admin-coupons-page.tsx`: título "Cupones", botón "Agregar cupón", estados de carga, error con "Reintentar" y vacío ("Aún no tienes cupones"). Sin paginación ni buscador (ver Decisiones).
- **Componentes** en `features/admin/components/`:
  - `coupon-table.tsx`: columnas Código, Descuento (`10 %` / `S/ 5.00`), Usos por persona, Cupos (`12 / 50`, `Sin límite`), Vigencia (`1 dic 2026 – 31 dic 2026`, `Desde …`, `Hasta …` o `Siempre`), Activo (`Switch`), Acciones. Etiquetas `Agotado` y `Vencido` con el estilo de insignia (`text-caption`) junto al código. "Eliminar" deshabilitado con `title`/ayuda "Tiene pedidos asociados: desactívalo en su lugar" cuando `hasOrders`.
  - `coupon-dialog.tsx`: formulario con `react-hook-form` + `zod` (mismas reglas que el backend). Tipo como dos opciones (Porcentaje / Monto fijo) y el valor con sufijo `%` o prefijo `S/`. Campos opcionales con ayuda "Vacío = sin límite". Código deshabilitado con la ayuda de la spec cuando `hasOrders`. Los errores `409`/`400` del servidor se muestran bajo su campo (`setError`), igual que `category-dialog.tsx`.
  - `delete-coupon-dialog.tsx`: confirmación "¿Eliminar el cupón CEVICHE10? Esta acción no se puede deshacer.", como `delete-category-dialog.tsx`.
- **Design system**: `Dialog`, `Button`, `Input`, `Switch`, `Notification` y las utilities de la escala tipográfica (HT-12).

## Decisiones

- **Sin paginación ni búsqueda**: el negocio maneja pocos cupones; la lista completa ordenada del más nuevo al más antiguo basta. Si crece, se agrega como en categorías.
- **Fechas, no horas**: el formulario pide días (en hora de Lima) y el servidor los convierte a instantes; evita que el administrador tenga que pensar en husos horarios.
- **`PATCH /active` aparte del `PUT`**: el interruptor de la tabla cambia solo el estado, sin reenviar el formulario completo ni chocar con la validación del código.
- **Bloqueo de fila** en editar, cambiar estado y eliminar: es el mismo bloqueo que toma la creación de pedidos con cupón (HU-42).

## Impacto en docs/

- `docs/diagrama-de-casos-de-uso.md`: el Administrador gestiona los cupones (HU-43).
- `docs/diagrama-de-base-de-datos.md`: la nota "la gestión desde el panel llega en una historia posterior de E6" pasa a citar HU-43; el modelo no cambia.
- `specs/hu-42-cupones-de-descuento/spec.md`: el punto de fuera de alcance sobre el panel referencia HU-43.
- `frontend/src/features/admin/README.md`: la sección Cupones.
- `docs/historias.md` y `docs/epicas.md`: ya registran HU-43. `docs/cronograma.md`: cuando se asigne a un sprint.
