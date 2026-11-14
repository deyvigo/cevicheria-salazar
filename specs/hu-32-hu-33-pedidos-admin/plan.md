# Plan: HU-32 y HU-33 — Pedidos del panel en tiempo real y cambio de estado

`spec.md` en estado Clarificada.

## Backend

### Endpoints (paquete `admin`)

Todos bajo `/api/admin/orders`, así que ya los cubre `AdminAccessInterceptor` (`/api/admin/**`): 401 sin sesión, 403 sin rol `ADMINISTRADOR` (comprobado contra la base, no contra el claim del token).

| Método y ruta | Parámetros | Respuesta |
| --- | --- | --- |
| `GET /api/admin/orders` | `page`, `sort`, `dir`, `q`, `deliveryStatus`, `type`, `payment`, `paymentStatus`, `zone`, `from`, `to` (todos opcionales) | `200` con `PageResponse<AdminOrderRow>` |
| `GET /api/admin/orders/{id}` | — | `200` con `AdminOrderDetail`; `404` si no existe o no es un pedido comprado |
| `PATCH /api/admin/orders/{id}/delivery-status?from=EN_PREPARACION` | `from`: estado que el administrador vio en la fila | `200` con `AdminOrderRow` actualizado; `409` si el pedido ya no admite avanzar |
| `GET /api/admin/orders/zones` | — | `200` con la lista de nombres de zona distintos guardados en pedidos (para el filtro) |
| `GET /api/admin/orders/events` | — | `text/event-stream` (SSE) |

Notas de cada ruta:

- **Lista**. Parámetros:
  - `page` entero ≥ 1 (inválido o ausente = 1); si supera el total se devuelve la última, como `AdminCategoryService.list`. Tamaño fijo 20.
  - `sort` ∈ `code | date | customer | zone | total | deliveryStatus` (por defecto `date`) y `dir` ∈ `asc | desc` (por defecto `desc`). Un valor desconocido cae al por defecto, igual que `AdminProductSort`.
  - `deliveryStatus` ∈ `ACTIVE | EN_PREPARACION | EN_CAMINO | ENTREGADO | ALL` (por defecto `ACTIVE` = preparación y camino).
  - `type` ∈ `ENTREGA | RECOJO`; `payment` ∈ `ONLINE | EFECTIVO | YAPE`; `paymentStatus` ∈ `PAGADO | PENDIENTE_COBRO`; `zone` = nombre exacto de zona. Ausente = sin filtrar.
  - `from` y `to` son fechas `yyyy-MM-dd` interpretadas en `America/Lima` (`from` desde 00:00, `to` hasta el fin del día, ambos inclusive); cualquiera puede faltar. Los atajos (Hoy, Ayer, Últimos 7 días) los resuelve el frontend a `from`/`to`. Si `from > to` responde `400`.
  - `q` busca por código (se normaliza quitando `SAL-` y ceros a la izquierda, comparando el número) o por nombre y apellido del cliente, sin tildes ni mayúsculas.
- **Fila** (`AdminOrderRow`): `{ id, code, purchasedAt, customerName, deliveryType, zoneName, paymentMethod, collectionMethod, paymentStatus, total, cashChange, deliveryStatus }`. `cashChange` es `cashAmount - total` solo con efectivo y monto indicado; en otro caso `null`. No incluye teléfono, dirección ni `deliveryCode`.
- **Detalle** (`AdminOrderDetail`): lo de la fila más `customerPhone`, `addressText`, `addressReference`, `items[{ name, quantity, unitPrice, lineTotal }]`, `subtotal`, `discount`, `deliveryPrice`, `cashAmount`. **Nunca** `deliveryCode`, `preferenceId` ni `initPoint`.
- **Cambio de estado**: el servidor lee el estado actual dentro de la transacción con `findByIdForUpdate` (bloqueo pesimista, ya existe) y avanza al siguiente solo si coincide con `from`; en otro caso responde `409`. El destino lo decide siempre el servidor. `from` existe para que un segundo administrador con la fila desactualizada no avance el pedido dos pasos (la spec lo exige). Un pedido ya `ENTREGADO` o no comprado también responde `409`.

### Capas

- **`DeliveryStatus`**: se agrega `next()` (`EN_PREPARACION -> EN_CAMINO -> ENTREGADO`, `Optional` vacío al final) y se mantiene sin setter público en `Order`; en su lugar `Order.advanceDelivery(DeliveryStatus expected)` valida y avanza, lanzando una excepción de dominio si no corresponde.
- **`AdminOrderController`**: ruta, validación de parámetros y mapeo de errores. Solo delega.
- **`AdminOrderService`**:
  - `list(...)`, `detail(id)`, `advance(id, from)` y `zones()`.
  - Reutiliza `catalogo.dto.PageResponse`.
  - Para los platos del detalle usa `OrderRepository.findItemsByOrderIds`.
- **`AdminOrderRepository`** (o métodos en `OrderRepository`): `AdminOrderQuery`, con la API Criteria de JPA, para los filtros opcionales y el orden dinámico. `Order` no tiene relación con `User` (solo `userId`), así que la consulta une ambas raíces por `user.id = order.userId` y selecciona el pedido con el nombre del cliente, sin cargar `items`. El conteo usa la misma condición. Para la búsqueda por texto se reutiliza `unaccent` (extensión ya creada en `V4__product_search.sql`) mediante una función nativa registrada en los criterios, como hace la búsqueda de platos (HU-09).
- **Orden**: `date` = `coalesce(paidAt, createdAt)`; `customer` = apellido y luego nombre; `zone` = `deliveryZoneName` con nulos al final en ambos sentidos; `deliveryStatus` = expresión `case` por flujo (1, 2, 3), no por texto. Desempate fijo: fecha descendente, luego id descendente.
- **`OrderEventPublisher`** (paquete `pedidos`, sin depender de `admin`): publica un `OrderChangedEvent(type, orderId)` con `ApplicationEventPublisher`. Se llama desde donde un pedido pasa a comprado (`PaymentSettlementService` cuando llama a `order.markPaid()`, y `OrderService` al confirmar contraentrega, ambos ya existentes) y desde `AdminOrderService.advance`. Un `@TransactionalEventListener(phase = AFTER_COMMIT)` lo recibe, de modo que nunca se avisa de un cambio que luego se revierte.
- **`AdminOrderEventsService`** (paquete `admin`): mantiene los `SseEmitter` abiertos en una colección concurrente. Al recibir el evento envía `event: pedido-creado` o `event: pedido-actualizado` con `data: {"orderId": 42}` a todos. Elimina el emitter en `onCompletion`, `onTimeout` y `onError`. Emite un comentario `:keepalive` cada 25 s con `@Scheduled` (`SchedulingConfig` ya existe) para que ni Cloudflare ni Traefik cierren la conexión por inactividad. Timeout del emitter largo (30 min); el navegador reconecta solo.
  - Cada evento lleva un `id` creciente (inicia con la hora de arranque) y se guardan los últimos 200 en memoria. Al reconectar, el navegador envía `Last-Event-ID` y el servidor reenvía los posteriores antes de registrar el suscriptor (bajo un mismo cerrojo, para no perder ninguno). Un id inválido o de una ejecución anterior no reenvía nada.
  - Cada suscriptor escribe en su propio hilo (virtual): un cliente lento o colgado solo se retrasa a sí mismo, y el hilo que confirmó el pedido nunca espera a una conexión.
- **`AdminOrderController.events`**: `@GetMapping(path = "/eventos", produces = TEXT_EVENT_STREAM_VALUE)` que devuelve el `SseEmitter`. La verificación de rol ocurre antes por el interceptor.
- **Agrupar avisos**: no se hace en el servidor; lo resuelve el frontend con *debounce* al invalidar la consulta (ver Frontend).
- **`ApiExceptionHandler`**: nueva excepción `OrderDeliveryConflictException` → `409` con `ApiError`.

### Autenticación del SSE

`EventSource` no permite cabeceras personalizadas, pero el JWT va en cookie, que `JwtAuthFilter` ya lee. Como el frontend (Cloudflare Pages) y la API están en dominios distintos, el frontend abre `new EventSource(url, { withCredentials: true })` y `CorsConfig` ya permite credenciales para el origen del frontend; hay que comprobar que `GET /api/admin/orders/eventos` está cubierto por esa regla de CORS.

La renovación de sesión (HU-04) ocurre en axios; una conexión SSE abierta no se renueva sola. Cuando el servidor cierra la conexión por sesión vencida, el navegador intenta reconectar con la cookie vieja, recibe 401 y `EventSource` deja de reintentar. El frontend lo detecta con `onerror` + `readyState === CLOSED`, pide una consulta normal (que dispara la renovación o el redireccionamiento al login) y vuelve a abrir la conexión.

### Base de datos

Sin tablas ni columnas nuevas. Solo una migración de índices, `V14__admin_orders_indexes.sql`, que cubre el orden por defecto y el filtro activo:

```sql
-- Default order of the admin orders table (purchased date desc) and its "active" filter
CREATE INDEX idx_orders_admin_purchased ON orders ((COALESCE(paid_at, created_at)) DESC, id DESC)
    WHERE status IN ('PAGADO', 'PENDIENTE_COBRO');
```

El índice existente `idx_orders_user_purchased` empieza por `user_id`, así que no sirve para la vista del administrador. No se agregan más índices; con el volumen de un local, los filtros restantes se resuelven sobre ese recorrido. Hibernate sigue en `validate`.

## Frontend

### Rutas y estado de la vista

- `admin-sections.ts` ya tiene `pedidos`. La ruta `/admin/pedidos` pasa de `AdminSectionPage` a `AdminOrdersPage`.
- El estado de la vista (`page`, `sort`, `dir`, `q`, `deliveryStatus`, `type`, `payment`, `paymentStatus`, `zone`, `from`, `to`) vive en la URL con `useSearchParams`, como `admin-products-page.tsx`. Los valores por defecto no se escriben en la URL, y cambiar cualquier filtro, la búsqueda o el orden borra `page`.

### Pantallas y componentes (`src/features/admin/`)

- **`admin-orders-page.tsx`**: orquesta toolbar, tabla, paginación, estados (carga, error con "Reintentar", vacío con dos textos) y el aviso "N pedidos nuevos". Si `data.page !== page` y no es dato de relleno, navega a `data.page` con `replace`, como el panel.
- **`components/order-filters.tsx`**: buscador (`search-box.tsx`/`Input`, con *debounce* de 300 ms) y selectores. El filtro de fecha ofrece Hoy, Ayer, Últimos 7 días, Todas y Personalizado (dos `Input type="date"`); los atajos se convierten a `from`/`to` en hora de Lima. Valida `Desde <= Hasta` en el cliente (mensaje en los campos y se conserva el filtro anterior). "Limpiar filtros" aparece si hay algo distinto de lo por defecto.
- **`components/order-table.tsx`**: tabla con encabezados ordenables (`aria-sort`, botón con indicador de dirección) solo en Código, Fecha, Cliente, Zona, Total y Estado de entrega. En celular la tabla pasa a tarjetas apiladas con el mismo contenido, igual que otras vistas del panel.
- **`components/order-status-badge.tsx`**: etiqueta con texto en español ("En preparación", "En camino", "Entregado") y color solo como refuerzo, usando tokens existentes.
- **`components/advance-status-button.tsx`**: `Button` "Marcar en camino" / "Marcar entregado", deshabilitado mientras la mutación está en curso. "Marcar entregado" abre un `Dialog` de confirmación. En `409` refresca la fila y muestra una `Notification` indicando que el pedido ya había cambiado.
- **`components/order-detail-dialog.tsx`**: `Dialog` (o panel lateral) con el detalle completo y el mismo botón de avance. Consulta `GET /api/admin/orders/{id}` y se invalida con los avisos de ese pedido.
- **`admin-order-api.ts`**: `listOrders(params)`, `getOrder(id)`, `advanceOrder(id, from)`, `listOrderZones()` con la instancia `api`; tipos `AdminOrderRow`, `AdminOrderDetail`, `DeliveryStatus`.
- **`use-admin-orders.ts`**: `useQuery(['admin-orders', params])` con `placeholderData: keepPreviousData`. **`use-admin-order-mutations.ts`**: la mutación de avance, que actualiza la fila en caché al responder.
- Textos de estado y formatos en un único módulo (`order-labels.ts`): etiquetas de estado, de método de pago, y fecha con `Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })`; precios con `formatPrice` (`S/ 32.00`).

### Tiempo real y aviso de pestaña

- **`use-admin-order-events.ts`**: abre la conexión SSE **una vez** mientras el panel (`AdminLayout`) está montado, no solo en `/admin/pedidos`, para que el contador funcione desde otras secciones. Se cierra al desmontar el panel o al cerrar sesión.
  - Al recibir `pedido-creado` o `pedido-actualizado`: invalida `['admin-orders']` y `['admin-order', id]` agrupando con *debounce* (~300 ms) para absorber ráfagas.
  - Al reconectar (`onopen` tras una caída) refresca la lista.
  - Expone `connected` para el indicador "Sin conexión en tiempo real".
- **Resalte de nuevos**: el proveedor guarda el conjunto `newOrderIds` (ids de `pedido-creado` recibidos, en vivo o reenviados) y lo expone con `useNewOrders()`. La tabla marca esas filas (borde izquierdo `naranja-500`, fondo `surface-naranja`, etiqueta "Nuevo"); abrir el detalle, avanzar el estado o "Marcar como vistos" los quita. Vive en memoria del panel: sobrevive al cambio de sección y de página, no a recargar.
- **Contador de nuevos**: un pequeño *store* en el contexto del panel suma `pedido-creado` cuando `document.visibilityState === 'hidden'` y se reinicia con el evento `visibilitychange` al volver. No se afecta por filtros.
- **`use-tab-alert.ts`**: pone `document.title` como `(N) Pedidos | <título original>` y cambia el favicon dibujándolo en un `<canvas>` con un punto; al llegar a 0 restaura título y favicon originales.
- **Aviso "N pedidos nuevos"** dentro de la página: cuando la vista no es página 1 con orden por defecto, los `pedido-creado` solo incrementan un contador local y la tabla **no** se invalida por esa causa; la acción del aviso restablece `page`/`sort`/`dir` y refresca. Los `pedido-actualizado` sí actualizan en su sitio aunque la vista no sea la por defecto.
- **Fila que deja de cumplir el filtro** (por ejemplo pasa a Entregado con "Activos"): se actualiza en el caché local y se retira al siguiente refresco, no mientras el administrador opera.

### Design system

`Button`, `Card`, `Dialog`, `Input`, `Notification` y `Pagination` ya existen. Sin tokens nuevos. La tabla y el selector no tienen referencia visual propia en `design-system/`; se construyen con tokens de color, radio y tipografía existentes, siguiendo `product-table.tsx`.

## Seguridad

- Rol `ADMINISTRADOR` en todas las rutas por `AdminAccessInterceptor` (consulta la base). El guard del frontend es solo UX.
- El SSE hereda esa verificación: sin sesión 401, sin rol 403, y nunca emite eventos a quien no la pasó.
- El aviso de SSE solo lleva tipo de evento e id; los datos siempre se piden por la API protegida.
- `deliveryCode`, `preferenceId` e `initPoint` no salen en ninguna respuesta de esta sección.
- El servidor decide el destino de la transición; el parámetro `from` es solo una guarda contra filas desactualizadas, y el `PATCH` toma bloqueo pesimista sobre el pedido.
- Parámetros de orden y filtro con listas cerradas (enums); `q` se pasa como parámetro enlazado, nunca concatenado.

## Decisiones

- **SSE en memoria, una instancia**: un solo contenedor `api` en el VPS; con varias instancias haría falta Redis pub/sub. Redis no se usa para esto: no es fuente de verdad y la spec lo deja fuera de alcance.
- **Eventos tras el commit**: `@TransactionalEventListener(AFTER_COMMIT)` evita avisar de cambios que se revierten.
- **`PATCH` con `from`**: un "avanza al siguiente" sin más permitiría que una fila vieja avance dos pasos; la spec lo prohíbe.
- **Proyección directa**: la lista proyecta a `AdminOrderRow` en la consulta en vez de cargar entidades, para evitar traer `items` y evitar N+1.
- **Zona por nombre guardado**: coincide con la decisión de la spec; `GET /api/admin/orders/zones` devuelve nombres distintos del propio `orders`, no de `delivery_zones`.
- **Apagado ordenado**: Spring Boot espera a que terminen las peticiones abiertas, y un stream SSE no termina solo; `AdminOrderEventsService` es un `SmartLifecycle` de fase máxima que cierra los emitters antes de esa espera. Se verifica con `AdminOrderStreamIT` (servidor real en puerto aleatorio).
- **Rutas en inglés**: `/api/admin/orders/...`, como `/api/admin/categories` y `/api/admin/products`; la URL del panel sigue en español (`/admin/pedidos`).
- **Migración `V14`**: la `V13` la usa `feature/HU-21-order-confirmation`; con otro número no chocan al hacer merge.
- **Sin sonido ni notificaciones del sistema**: fuera de alcance de la spec.

## Impacto en docs/

- `docs/diagrama-de-arquitectura.md`: agregar el canal SSE (`/api/admin/orders/eventos`) entre la capa de controladores y el panel de administración, y los eventos publicados desde el servicio de pedidos.
- `docs/diagrama-de-despliegue.md` y `docs/guia-de-despliegue.md`: Traefik debe permitir conexiones largas en `api.` (sin *buffering* de respuesta y con timeout de lectura mayor al intervalo de `:keepalive`); si la API pasa por el proxy de Cloudflare, tener presente su límite de inactividad (~100 s) y por eso el latido cada 25 s.
- `docs/diagrama-de-base-de-datos.md`: mencionar el índice de `V14__admin_orders_indexes.sql` en la descripción de `orders`. No hay tablas ni columnas nuevas.
- `docs/cronograma.md`: agregar HU-32 y HU-33 al sprint correspondiente, como se hizo con HU-21 y HU-25.
