# Tareas: HU-32 y HU-33 — Pedidos del panel en tiempo real y cambio de estado

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica. Backend primero (con sus tests), luego frontend.

## Backend

- [x] `DeliveryStatus.next()` y `Order.advanceDelivery(expected)` con excepción de dominio `OrderDeliveryConflictException` (→ `409` en `ApiExceptionHandler`) — cubre: Cambiar el estado (un paso a la vez, sin retroceso, sin doble avance) — verificación: test unitario de las tres transiciones, del rechazo desde `ENTREGADO` y de `expected` distinto del actual
- [x] Migración `V14__admin_orders_indexes.sql` (índice parcial por fecha de compra) — cubre: Ordenamiento por defecto — verificación: `./mvnw test -Dtest='*IT'` aplica Flyway y Hibernate `validate` pasa
- [x] DTOs `AdminOrderRow`, `AdminOrderDetail` (sin `deliveryCode`, `preferenceId` ni `initPoint`) y cálculo de `cashChange` — cubre: Columnas de la tabla, Detalle, Seguridad — verificación: test unitario del mapeo (efectivo con y sin monto, Yape, online, Recojo sin zona)
- [x] Consulta de lista con filtros (`deliveryStatus`, `type`, `payment`, `paymentStatus`, `zone`, `from`/`to` en hora de Lima, `q` por código normalizado y por cliente sin tildes), solo `PAGADO`/`PENDIENTE_COBRO` — cubre: Qué pedidos aparecen, Filtros y búsqueda — verificación: IT con pedidos de distintos estados, métodos y fechas; filtro por defecto `ACTIVE`; `q` = `SAL-001042`, `1042` y nombre con tilde; `from > to` → `400`
- [x] Orden por `date`, `code`, `customer`, `zone` (nulos al final en ambos sentidos), `total` y `deliveryStatus` (por flujo) con desempate por fecha y id; valores desconocidos caen al por defecto — cubre: Ordenamiento — verificación: IT por cada columna en ambos sentidos y estabilidad entre páginas
- [x] Paginación de 15 y página fuera de rango → última — cubre: Paginación — verificación: IT con 20 pedidos (páginas 1, 2, 9 y 0)
- [x] `AdminOrderService.detail` y `GET /api/admin/orders/{id}` (`404` si no existe o no es comprado) — cubre: Detalle del pedido — verificación: IT de detalle con platos y de un `PENDIENTE_PAGO` → `404`
- [x] `PATCH /api/admin/orders/{id}/delivery-status?from=` con bloqueo pesimista — cubre: Cambiar el estado, carrera entre administradores — verificación: IT de avance normal, `409` con `from` desactualizado, `409` desde `ENTREGADO`, y dos solicitudes concurrentes con el mismo `from` (solo una avanza)
- [x] `GET /api/admin/orders/zonas` (nombres distintos guardados en pedidos) — cubre: Filtro de zona — verificación: IT con una zona luego desactivada y renombrada
- [x] `OrderChangedEvent` y `OrderEventPublisher`, llamado desde `PaymentSettlementService` (pago aprobado), `OrderService` (contraentrega confirmada) y `AdminOrderService.advance`, con listener `AFTER_COMMIT` — cubre: Tiempo real, cambio de estado emite aviso — verificación: test que comprueba que el evento se publica al confirmar y **no** se publica si la transacción hace *rollback*
- [x] `AdminOrderEventsService` (emitters concurrentes, limpieza en completion/timeout/error, `:keepalive` cada 25 s) y `GET /api/admin/orders/eventos` — cubre: Tiempo real, Seguridad (carga solo tipo e id) — verificación: test del servicio con emitters simulados y del cuerpo del evento; IT con 401 sin sesión y 403 con cliente
- [x] Verificar que `CorsConfig` permite `withCredentials` para `/api/admin/orders/eventos` — cubre: Tiempo real con frontend en otro dominio — verificación: test de CORS preflight/cabeceras sobre esa ruta
- [x] Tests de seguridad generales de `/api/admin/orders/**` (401 y 403 en cada ruta) — cubre: Seguridad — verificación: `./mvnw test -Dtest='*IT'`

## Frontend

- [x] `order-labels.ts` (estados, pagos, fecha en hora de Lima, `formatPrice`) y `admin-order-api.ts` con tipos — cubre: Columnas, textos en español — verificación: test unitario de etiquetas y formatos
- [x] Estado de la vista en la URL (`page`, `sort`, `dir`, `q`, filtros, `from`, `to`); los valores por defecto no se escriben y cambiar filtros/orden/búsqueda borra `page` — cubre: Navegación, Filtros, Paginación — verificación: test del hook de parámetros
- [x] `use-admin-orders.ts` y `admin-orders-page.tsx` con estados de carga, error con reintento y vacío (dos textos), total de pedidos y redirección a la última página — cubre: Columnas (estados), Paginación — verificación: test de página con la API simulada
- [x] `order-table.tsx` con encabezados ordenables solo en las seis columnas (`aria-sort`), orden por defecto fecha descendente  — cubre: Ordenamiento, Columnas — verificación: test de clic en encabezados y de los no ordenables; revisión en navegador a ancho móvil
- [x] `order-filters.tsx`: búsqueda con *debounce*, selectores, atajos de fecha, rango Personalizado con validación `Desde <= Hasta` y "Limpiar filtros" — cubre: Filtros y búsqueda — verificación: test de cada filtro, de la combinación y del error de rango (conserva el filtro anterior)
- [x] `order-status-badge.tsx` y `advance-status-button.tsx` con confirmación solo al marcar entregado, botón deshabilitado en curso y manejo de `409` — cubre: Cambiar el estado — verificación: test de los tres estados, de la confirmación y del `409` con aviso
- [x] `order-detail-dialog.tsx` con el detalle completo, sin código de entrega, y botón de avance — cubre: Detalle del pedido — verificación: test del contenido y de que no aparece el código de 4 dígitos
- [x] `use-admin-order-events.ts` (SSE una vez en `AdminLayout`, invalidación con *debounce*, refresco al reconectar, reapertura tras 401, indicador "Sin conexión en tiempo real") — cubre: Tiempo real — verificación: test con un `EventSource` simulado (evento → refetch; caída y reconexión → refetch; 401 → reabre)
- [x] Aviso "N pedidos nuevos" cuando la vista no es página 1 con orden por defecto; `pedido-actualizado` actualiza la fila en su sitio — cubre: Tiempo real — verificación: test con vista en página 2 y con otro orden
- [x] `use-tab-alert.ts`: contador en título y favicon con la pestaña oculta, independiente de filtros y de la sección, y reinicio al volver — cubre: Aviso con la pestaña oculta — verificación: test con `visibilityState` simulado y comprobación del título; revisión del favicon en navegador
- [x] Ruta `/admin/pedidos` apuntando a `AdminOrdersPage` y limpieza del marcador anterior — cubre: Navegación y acceso — verificación: test de ruta y guard

## Mejoras posteriores a la primera entrega

- [x] Reenvío de avisos perdidos con `Last-Event-ID` (historial de 200 en memoria) y escritura por suscriptor en su propio hilo — cubre: Tiempo real (reconexión), caso borde de conexión lenta — verificación: `AdminOrdersIT` (reconexión con el id del último evento) y `AdminOrderStreamIT`
- [x] Resalte de pedidos nuevos en la tabla, contador "sin revisar" y "Marcar como vistos" — cubre: Pedidos nuevos resaltados — verificación: `admin-orders-page.test.tsx` y `admin-orders-live.test.tsx`

## Docs

- [x] Actualizar `docs/diagrama-de-arquitectura.md` (canal SSE), `docs/diagrama-de-despliegue.md` y `docs/guia-de-despliegue.md` (Traefik y Cloudflare con conexiones largas), `docs/diagrama-de-base-de-datos.md` (índice de V14) y `docs/cronograma.md` — cubre: Impacto en docs — verificación: revisión manual
- [x] Repasar cada criterio de `spec.md`, marcar el estado como Hecha y sincronizar spec/plan si la implementación se desvió — cubre: todos — verificación: repaso manual y `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`
- [x] Verificación manual en navegador con dos sesiones de administrador: pedido nuevo en vivo, contador con la pestaña oculta, avance de estado visto en la otra sesión y en "Mis pedidos" del cliente — cubre: Tiempo real, Aviso con la pestaña oculta, Cambiar el estado — verificación: `./scripts/dev.sh` y recorrido manual
