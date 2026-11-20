# Tareas: HU-26 — Seguir el estado de mi pedido

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

- [x] Migración `V15` y enum `DeliveryStatus` con transiciones — cubre: estados, transiciones — verificación: `OrderTest`
- [x] `Order.moveDelivery`, motivo y reembolso — cubre: avance, motivo, reembolso — verificación: `OrderTest`
- [x] `OrderLifecycleService.changeDelivery` con reposición de stock — cubre: stock y reembolso — verificación: `AdminOrdersIT`
- [x] Endpoints de admin (`delivery-status` con body, `refund`) y filtros/orden de 10 estados — cubre: avance, panel — verificación: `AdminOrdersIT`
- [x] Cancelar pedido propio `POST /api/orders/{id}/cancel` — cubre: cliente — verificación: `OrderControllerIT`
- [x] Correos de hitos — cubre: notificaciones — verificación: `OrderStatusNotificationServiceTest`
- [x] Frontend cliente: barra de hitos, mensajes, estados negativos, cancelar — cubre: cliente — verificación: tests de `perfil` y navegador
- [x] Frontend admin: botones por estado, diálogo de motivo y de código de entrega, reembolso, filtros — cubre: panel — verificación: tests de `admin` y navegador
- [x] Docs: `docs/diagrama-de-base-de-datos.md` y nota en la spec de HU-32/33 — cubre: impacto en docs — verificación: revisión
