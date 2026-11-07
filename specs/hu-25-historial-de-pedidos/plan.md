# Plan: HU-25 — Ver el historial de mis pedidos

`spec.md` en estado Clarificada.

## Backend

### Endpoint (paquete `pedidos`)

Se agrega al `OrderController` existente (`/api/pedidos`); el usuario sale siempre del `Authentication`. Sin sesión `401`; rol `CLIENTE` exigido en el servicio, como en `OrderService`.

| Método y ruta | Parámetros | Respuesta |
| --- | --- | --- |
| `GET /api/pedidos?page=1` | `page` (opcional, entero ≥ 1; inválido o ausente = 1) | `200` con `PageResponse<OrderSummaryResponse>` |

`GET /api/pedidos/{id}` ya existe y no cambia; no hay conflicto de rutas porque `{id}` es numérico y la lista no lleva segmento.

`OrderSummaryResponse`: `{ id, code, itemNames, total, purchasedAt, deliveryStatus }`. `itemNames` es la lista de `product_name` de los platos, en el orden de `order_items.id`; el frontend arma el título. No expone `deliveryCode`, dirección ni método de pago.

**Reglas**
- Filtra `user_id = :userId` **y** `status IN (PAGADO, PENDIENTE_COBRO)`.
- `purchasedAt = COALESCE(paid_at, created_at)`: `paid_at` para el pago en línea y `created_at` para la contraentrega (no tiene `paid_at`).
- Orden: `purchasedAt` descendente, luego `id` descendente (estable entre páginas).
- Tamaño de página fijo: 10. Si la página pedida supera el total y hay resultados, se devuelve la última (mismo criterio que `AdminCategoryService.list`).

### Capas

- **`OrderStatus`/`Order`**: nuevo enum **`DeliveryStatus`** (`EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`) y campo `deliveryStatus` en `Order` (`@Enumerated(STRING)`, por defecto `EN_PREPARACION`, sin setter público: cambiarlo es del panel de pedidos).
- **`OrderRepository`**: consulta paginada de resúmenes con `Pageable` ordenado por la expresión `coalesce(o.paidAt, o.createdAt) desc, o.id desc` (en JPQL, con `countQuery` propio); más una consulta de `OrderItem` por `order.id in :ids` ordenada por `id` para traer los nombres de la página en una sola consulta (evita N+1 y no hace `fetch join` con paginación).
- **`OrderService.listPurchased(userId, page)`** (`@Transactional(readOnly = true)`): arma el `PageResponse` (reutiliza `catalogo.dto.PageResponse`) combinando la página con los nombres de los platos.
- **`OrderController.list`**: `@GetMapping` con `@RequestParam(defaultValue = "1") int page`; valores < 1 se tratan como 1.
- **`SecurityConfig`**: sin cambios (`/api/pedidos/**` ya exige sesión).

### Base de datos

Migración `V12__order_delivery_status.sql`:

```sql
-- Delivery stage of a purchased order (HU-25); independent from status, which only tracks payment.
ALTER TABLE orders
    ADD COLUMN delivery_status VARCHAR(20) NOT NULL DEFAULT 'EN_PREPARACION'
        CHECK (delivery_status IN ('EN_PREPARACION', 'EN_CAMINO', 'ENTREGADO'));

CREATE INDEX idx_orders_user_purchased ON orders (user_id, (COALESCE(paid_at, created_at)) DESC, id DESC)
    WHERE status IN ('PAGADO', 'PENDIENTE_COBRO');
```

Los pedidos existentes quedan en `EN_PREPARACION`. Hibernate sigue en `validate`.

## Frontend

### Rutas (`router.tsx`)

Dentro del `ProfileLayout` se agrega `mis-pedidos` → `MyOrdersPage`, y `profile-sections.ts` suma `{ path: 'mis-pedidos', label: 'Mis pedidos' }` después de "Mis direcciones". `profile-nav.tsx` tiene un mapa de íconos por sección: se agrega un ícono de pedido (lista/bolsa) como `orders-icon.tsx`, siguiendo `pin-icon.tsx`.

### Pantallas y componentes

- **`features/perfil/my-orders-page.tsx`**: página en `?page=N` (mismo `pageFrom(params)` que `admin-products-page.tsx`), `useMyOrders(page)` con `placeholderData: keepPreviousData` para no parpadear al paginar. Estados: carga, error con "Reintentar", vacío ("Aún no tienes pedidos" con `Link` a la carta `/`) y lista de tarjetas con `Pagination` debajo (`data.page`, `data.totalPages`). Si `data.page !== page` y no es dato de relleno, navega a `data.page` con `replace` (igual que el panel).
- **`features/perfil/components/order-card.tsx`**: `Card` con título (nombres de platos: los dos primeros unidos por coma y " y N más" si hay más; `truncate`/`line-clamp-2` para largos), código en texto pequeño, fecha (`Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' })`), precio con `formatPrice` y `DeliveryProgress`.
- **`features/perfil/components/delivery-progress.tsx`**: texto del estado arriba y debajo una línea con 3 puntos conectados (tokens: `bg-action` para los alcanzados, `bg-line`/borde para los pendientes). Texto accesible con el estado actual; la línea se marca `aria-hidden` (o `role="img"` con `aria-label="Paso 2 de 3: En camino"`), de modo que no dependa del color.
- **`features/perfil/order-api.ts`**: `listMyOrders(page)` con la instancia `api` (`GET /api/pedidos`); tipos `OrderSummary`, `DeliveryStatus` y `Page<OrderSummary>` (reutiliza el tipo de página de `catalog-api.ts`).
- **`features/perfil/use-my-orders.ts`**: `useQuery(['my-orders', page])`.
- Design system: `Card`, `Button` y `Pagination` existentes. Sin tokens nuevos; la línea de progreso es el único componente sin referencia visual y solo usa tokens de color existentes.

## Seguridad

- La pertenencia se verifica en la consulta (`userId` del JWT en el `WHERE`); no existe ningún parámetro para pedir pedidos de otro cliente.
- La respuesta no incluye `delivery_code`, dirección ni datos de pago.
- Rol `CLIENTE` en el servicio; el guard del frontend es solo UX.

## Decisiones

- **Campo separado `delivery_status`** en vez de ampliar `status`: pago y entrega evolucionan por separado, y HU-26 y el panel de pedidos podrán cambiar uno sin tocar el otro.
- **Una consulta de platos por página** (`order.id in :ids`) en lugar de `fetch join`: Hibernate pagina en memoria con colecciones en `fetch join`.
- **Tamaño de página fijo en el servidor** (10), como el panel; el cliente solo pide `page`.
- **`COALESCE(paid_at, created_at)` como fecha de compra**, con índice parcial para el orden; evita una columna nueva `purchased_at` que habría que mantener.
- **Reutiliza `PageResponse`** de `catalogo.dto` aunque viva en otro paquete, como ya hace `admin`.
- **Sin `mutaciones`**: la historia solo lee; nada invalida `['my-orders']` todavía (HU-26 y el panel lo harán).

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: describir `delivery_status` en `orders` (valores, valor inicial y que es independiente de `status`); regenerar `images/database-diagram.png` si el diagrama muestra las columnas de `orders`.
- `docs/cronograma.md`: marcar HU-25 al cerrar.
- Arquitectura y casos de uso: sin cambios (ya mencionan HU-25).
