# Tareas: HU-40 — Ver el detalle de un pedido desde Mis pedidos

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

- [x] Backend: confirmar en `OrderControllerIT` que `GET /api/orders/{id}` responde 404 para un pedido de otro cliente y 401 sin sesión; agregar el test que falte (ya existían: `OrderControllerIT` cubre 401 sin sesión y 404 de pedido ajeno) — cubre: Seguridad — verificación: `./mvnw test -Dtest='OrderControllerIT'`
- [x] `DeliveryProgress` con prop `size` (`sm` por defecto, `lg` con etiquetas bajo cada punto, `<ol>` accesible y ajuste a dos líneas); extraer `NegativeStatusNotice` de `order-card.tsx` — cubre: Estado de entrega (versión grande) — verificación: `tests/features/perfil/components/delivery-progress.test.tsx` (hitos de Recojo y Entrega, `LISTO_PARA_ENVIO` como "Preparando", `aria-current`, la variante `sm` no cambia) y `order-card.test.tsx`
- [x] `useCancelMyOrder` invalida también `['order', id]` — cubre: Cancelar, casos borde (lista y detalle al día) — verificación: `tests/features/perfil/use-cancel-my-order.test.tsx`
- [x] Componentes del detalle: `order-detail-info.tsx` (recibes, pagas, fechas; `InfoItem` exportado de `order-info-list.tsx`) y `DeliveryCodeBox` — cubre: Qué muestra el detalle, Código de entrega, datos opcionales sin "null" — verificación: `tests/features/perfil/components/order-detail-info.test.tsx` (Entrega con y sin referencia, Recojo, Yape, efectivo con vuelto, contraentrega sin fecha de pago)
- [x] `order-detail-page.tsx` y ruta `mis-pedidos/:orderId` en `router.tsx` — cubre: Qué muestra el detalle, Estado de entrega, Código de entrega, Cargando/error/no encontrado, cancelar desde el detalle — verificación: `tests/features/perfil/order-detail-page.test.tsx` (pedido en curso con código, estados finales sin código, rechazado/cancelado/fallido con motivo y reembolso, 404, id inválido, pedido no comprado, error con reintento, cancelar un `PENDIENTE`)
- [x] `order-card.tsx` clicable (enlace extendido, texto para lector de pantalla, `state.page`) y enlace "Volver a mis pedidos" con `?page=N` — cubre: Abrir el detalle desde la lista, Volver — verificación: `tests/features/perfil/components/order-card.test.tsx` (clic en la tarjeta navega; "Cancelar pedido" abre el diálogo y no navega; nombre accesible) y `order-detail-page.test.tsx` (volver conserva la página)
- [x] Pestaña "Mis pedidos" activa en el detalle y redirección a iniciar sesión con retorno — cubre: Abrir el detalle (pestaña activa), Sin sesión — verificación: `tests/features/perfil/profile-nav.test.tsx` / `profile-layout.test.tsx` y `tests/features/perfil/order-detail-page.test.tsx`
- [x] `header.tsx`: ítem "Mis pedidos" en el menú del nombre solo para `CLIENTE` — cubre: Acceso desde el menú del nombre — verificación: `tests/components/header.test.tsx` (cliente lo ve y navega; administrador no; teclado, `Escape` y clic fuera siguen cerrando el menú)
- [x] Docs: `frontend/src/features/perfil/README.md` con la ruta y la pantalla — cubre: Impacto en docs — verificación: revisión
- [x] Verificación final: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run`, `pnpm build` y prueba en navegador (celular y escritorio: menú, clic en tarjeta, estado grande, cancelar, volver con paginación, enlace directo y pedido ajeno) — cubre: todos — verificación: comandos y revisión de cada criterio de la spec

### Orden de commits (AGENTS.md)

1. `docs(specs): add spec, plan and tasks for HU-40` (incluye `docs/` actualizado).
2. Backend solo si hizo falta agregar tests: `test(backend): cover order detail access control (HU-40)`.
3. `feat(frontend): add the order detail screen and the My orders menu shortcut (HU-40)`.
