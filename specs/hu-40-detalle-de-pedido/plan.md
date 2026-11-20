# Plan: HU-40 — Ver el detalle de un pedido desde Mis pedidos

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

- **Endpoints**: ninguno nuevo. Se reutiliza `GET /api/orders/{id}` (HU-21), que ya devuelve platos, importes, tipo de entrega, dirección, medio de cobro y vuelto, fechas, código de entrega, `deliveryStatus`, `deliveryReason` y `refundStatus`.
- **Capas**: sin cambios. `OrderService.getOwned` ya busca por `id` y `userId` (`findByIdAndUserIdWithItems`), por lo que un pedido ajeno responde 404 (`OrderNotFoundException`) y sin sesión 401.
- **Base de datos**: sin cambios.
- **Verificación pendiente**: comprobar que `OrderControllerIT` cubre "pedido de otro cliente -> 404" y "sin sesión -> 401" en `GET /api/orders/{id}`; si falta alguno, agregar el test (sin cambiar código de producción).

## Frontend

- **Rutas** (`src/router.tsx`, dentro del `ProfileLayout`): `mis-pedidos/:orderId` -> `OrderDetailPage`. `NavLink` ya marca activa la pestaña "Mis pedidos" en subrutas, y `ProfileGuard` ya lleva a iniciar sesión (con `from`) y devuelve 404 a no clientes.
- **Pantalla** `features/perfil/order-detail-page.tsx`:
  - Lee `orderId` de la URL; si no coincide con `/^[0-9]+$/` o es 0, muestra "No encontramos este pedido".
  - Usa `useOrder(id, false)` (`features/checkout/use-order.ts`, clave `['order', id]`) sin polling.
  - "No encontrado" también cuando la API responde 404 **o** el pedido no está comprado (`status` distinto de `PAGADO` y `PENDIENTE_COBRO`): decisión del cliente, porque el checkout usa el mismo endpoint para pedidos sin pagar.
  - Estados de carga (esqueleto como `OrderResultPage`) y error (`role="alert"` con "Reintentar" y el enlace "Volver a mis pedidos").
  - Secciones en el orden de la spec: encabezado, estado de entrega, cómo lo recibes, cómo pagas, platos y totales, fechas, código de entrega, acciones.
- **Estado grande**: `DeliveryProgress` recibe una prop `size: 'sm' | 'lg'` (por defecto `'sm'`, la tarjeta no cambia). La variante `lg` usa `milestonesFor` y `milestoneIndex` de `delivery-status.ts` (mismos hitos, colores y mensajes), con texto del estado mayor, puntos y línea más gruesos y la etiqueta de cada hito bajo su punto (`text-sm`, centrada, con ajuste a dos líneas para que quepa en celular). La línea es una `<ol>` accesible con `aria-current="step"` en el hito actual; la variante `sm` conserva `aria-hidden`.
- **Estados negativos y reembolso**: se extrae de `order-card.tsx` un componente `NegativeStatusNotice` (mensaje, motivo, "Te devolveremos el pago" / "Pago reembolsado") con `size` para reutilizarlo en el detalle sin duplicar textos.
- **Tarjeta clicable** (`order-card.tsx`): patrón de enlace extendido. El título es un `Link` a `/perfil/mis-pedidos/{id}` con `after:absolute after:inset-0` y la `Card` pasa a `relative`; incluye texto solo para lector de pantalla ("Ver detalle del pedido SAL-001042") y `focus-visible:shadow-focus`. El botón "Cancelar pedido" lleva `relative z-10` para quedar sobre el enlace y no navegar. El `Link` pasa `state={{ page }}` con la página actual de la lista.
- **Volver**: el enlace "Volver a mis pedidos" va a `/perfil/mis-pedidos` con `?page=N` si `location.state.page > 1`; el botón atrás del navegador ya conserva la URL de la lista.
- **Secciones reutilizadas**: `OrderSummaryTable` (platos, subtotal, delivery, total) y `OrderCodes`-like para el código (nuevo `DeliveryCodeBox` en perfil, solo el recuadro del código, sin el código de pedido que ya está en el encabezado); `paymentMethodText`, `paymentStatusText` y `PAYMENT_PENDING_TEXT` de `order-payment-text.ts`; `formatPrice` y `formatDateTime` de `catalogo/format`. El bloque "recibes / pagas / fechas" va en un `order-detail-info.tsx` nuevo en `features/perfil/components/` (sin el nombre ni el estado, que ya están arriba); el `Item` de `order-info-list.tsx` se exporta como `InfoItem` para no duplicarlo.
- **Código de entrega**: se muestra solo si `deliveryStatus` no es `ENTREGADO`, `RECHAZADO`, `CANCELADO` ni `FALLIDO`. `deliveryCode` puede venir `null`: en ese caso no se renderiza.
- **Cancelar**: `CancelOrderDialog` se reutiliza tal cual. `useCancelMyOrder` además invalida `['order', id]` (hoy solo invalida `my-orders`), de modo que el detalle pasa a `CANCELADO` sin recargar y la lista no queda con un estado viejo.
- **Menú del nombre** (`src/components/header.tsx`): para `CLIENTE`, nuevo `Link` con `role="menuitem"` a `/perfil/mis-pedidos` entre "Mi perfil" y "Cerrar sesión", con las mismas clases y `onClick={() => setMenuOpen(false)}`.
- **Componentes del design system**: `Card`, `Button` (outline), `Dialog` (cancelar), tokens `bg-action`, `text-ink`, `text-ink-muted`, `text-error-text`, `border-border`, `bg-surface`; sin colores ni tamaños fuera de las utilities de Tailwind del tema.
- **Nombres de archivo** en kebab-case y tests en `frontend/tests/` replicando `src/`.

## Seguridad

- La autorización sigue en el servidor: `getOwned` filtra por el usuario de la sesión y no distingue "no existe" de "es de otro" (404). El código de entrega solo llega al dueño del pedido.
- El código de entrega se oculta en estados finales en el cliente; no es una medida de seguridad (el dueño ya lo recibió al comprar), solo evita mostrar algo sin uso.
- El filtro de "pedidos visibles" es de presentación: no expone datos nuevos, solo evita mostrar como comprado un pedido sin pagar que el dueño ya puede ver en el checkout.
- Sin datos sensibles en la URL (solo el id del pedido, validado como entero positivo).

## Decisiones

- **Sin cambios de backend**: el endpoint ya devuelve todo lo necesario y ya limita por dueño; evita tocar un contrato usado por el checkout.
- **Una sola fuente de verdad para el estado**: variante `lg` del mismo `DeliveryProgress`, no un componente nuevo, para que tarjeta y detalle nunca diverjan.
- **Ruta propia en vez de diálogo**: permite recargar, compartir el enlace y usar el botón atrás; el perfil sigue visible.
- **Enlace extendido en vez de `<a>` envolvente**: evita anidar el botón "Cancelar pedido" dentro de un enlace (HTML inválido).
- **Visibilidad decidida en el cliente**: ver Frontend; el costo es que un pedido sin pagar se descarga y se descarta; es un solo pedido propio, sin riesgo.
- **Sin actualización automática**: el detalle se refresca al volver a entrar (por defecto de react-query), como el resto de "Mis pedidos".

## Impacto en docs/

- `docs/historias.md`, `docs/epicas.md`, `docs/cronograma.md` y `docs/diagrama-de-casos-de-uso.md`: ya actualizados al crear la historia.
- `frontend/src/features/perfil/README.md`: agregar la pantalla de detalle y la ruta.
- Sin cambios en `docs/diagrama-de-arquitectura.md`, de despliegue ni de base de datos.
