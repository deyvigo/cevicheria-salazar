Perfil del cliente — épica [E5](../../../../docs/epicas.md#e5) (HU-23 a HU-27, HU-40).

Rutas bajo `/perfil`: `mi-informacion`, `mis-direcciones`, `mis-pedidos` (lista) y `mis-pedidos/:orderId` (detalle de un pedido, HU-40). El detalle reutiliza `GET /api/orders/{id}` y solo muestra pedidos comprados (`PAGADO` o `PENDIENTE_COBRO`); `DeliveryProgress` tiene la variante `size="lg"` para esa pantalla.
