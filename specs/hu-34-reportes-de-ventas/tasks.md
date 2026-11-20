# Tareas: HU-34 — Reporte de ventas

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica. Backend primero (con sus tests), luego frontend.

## Backend

- [x] Migración `V18__sales_report_indexes.sql` (índice parcial sobre `paid_at` de pedidos `PAGADO`) — cubre: Casos borde (rendimiento) — verificación: `./mvnw test -Dtest='*IT'` aplica Flyway y Hibernate `validate` pasa
- [x] DTO `SalesReport` y registros anidados (sin datos de clientes) — cubre: Tarjetas, Ventas por día, Ventas por método de pago, Platos más vendidos — verificación: test unitario del mapeo a JSON
- [x] `AdminReportService`: validación (falta de fechas, `from > to`, más de 366 días → `400`), granularidad (31 / 32 a 120 / más de 120 días) y relleno de periodos sin ventas — cubre: Filtros (validaciones), Ventas por día (ceros y agrupación) — verificación: test unitario de cada borde de granularidad y de rangos inválidos
- [x] Reparto de porcentajes por mayor resto y ticket promedio con `BigDecimal` — cubre: Tarjetas (Ticket promedio), Ventas por método de pago, Casos borde (precisión) — verificación: test unitario donde los porcentajes suman 100.0 (tercios y empates), con ingresos en cero y sin pedidos
- [x] `AdminReportQuery`: serie por día de Lima, ventas por método, resumen y ranking, con los filtros `payment` y `type` — cubre: Filtros, Ventas por día, Ventas por método de pago, Platos más vendidos — verificación: IT con pedidos online y de contraentrega (efectivo y Yape), de Entrega y Recojo, en distintos días
- [x] Reglas de "qué cuenta como venta": excluye `PENDIENTE_PAGO`, `CANCELADO`, `PENDIENTE_COBRO` y online `RECHAZADO` o `CANCELADO` (con y sin reembolso hecho); incluye online `FALLIDO` — cubre: Casos borde (qué cuenta como venta), Tarjetas (Ingresos) — verificación: IT con un pedido de cada estado y comprobación de ingresos y número de pedidos
- [x] Contraentrega: cuenta por `paid_at` (día del cobro, no del pedido); la que termina `RECHAZADO`, `CANCELADO` o `FALLIDO` no suma ni queda en "Por cobrar" — cubre: Casos borde (fecha que agrupa, contraentrega fallida), Tarjetas (Por cobrar) — verificación: IT con una contraentrega pedida el lunes y entregada el martes y otra fallida
- [x] Tarjeta "Reembolsos pendientes" sin rango de fechas y con filtros de método y tipo — cubre: Tarjetas (Reembolsos pendientes) — verificación: IT con un reembolso pendiente fuera del rango y uno ya reembolsado
- [x] Zona horaria y rango inclusivo: un pedido a las 21:00 de Lima cuenta ese día y uno a las 23:59:59 de la fecha final entra — cubre: Casos borde (zona horaria, rango inclusivo) — verificación: IT con pedidos a las 23:59:59 Lima, 00:00:00 Lima y 21:00 Lima
- [x] Ranking: orden por unidades, luego ingresos, luego nombre; máximo 10; sigue apareciendo un plato desactivado o eliminado — cubre: Platos más vendidos — verificación: IT con 12 platos, un empate y un plato con `product_soft_delete`
- [x] `GET /api/admin/reports/sales` en `AdminReportController` — cubre: Acceso, Filtros — verificación: IT del endpoint con parámetros válidos, enums inválidos y rangos inválidos
- [x] Tests de seguridad de la ruta (401 sin sesión y 403 con cliente) — cubre: Acceso — verificación: `./mvnw test -Dtest='*IT'`

## Frontend

- [x] Módulo `src/lib/lima-dates.ts` con los helpers de día de Lima movidos desde `admin-orders-view.ts`, más "30 días" y "Este mes" — cubre: Filtros (atajos), Casos borde (zona horaria) — verificación: test unitario con fechas cercanas a medianoche y cambio de mes; los tests de `admin-orders-view` siguen pasando
- [x] `admin-report-api.ts` con tipos y `use-admin-sales-report.ts` — cubre: Todas las secciones — verificación: test del hook con la API simulada
- [x] Estado de la vista en la URL (`range`, `from`, `to`, `payment`, `type`; los valores por defecto no se escriben) — cubre: Acceso (recargar conserva), Filtros — verificación: test del parseo y la serialización
- [x] `report-filters.tsx` con atajos, rango Personalizado y validaciones (`Desde <= Hasta`, máximo 366 días) — cubre: Filtros — verificación: test de cada atajo, de ambos errores (no se pide el reporte) y de la combinación con método y tipo
- [x] `report-summary-cards.tsx` con las seis tarjetas y formato `S/ 32.00` — cubre: Tarjetas de resumen — verificación: test con datos y con ceros
- [x] `sales-bar-chart.tsx` (SVG, etiquetas según granularidad, detalle con cursor, foco y toque, `role="img"`) — cubre: Ventas por día — verificación: test de barras por día (incluidos días en cero), del detalle y de las etiquetas semanal y mensual
- [x] `payment-donut.tsx` con tabla, total en el centro y detalle por segmento — cubre: Ventas por método de pago — verificación: test de que la dona coincide con la tabla y de una fila con ceros; revisión de contraste y de lectura sin color
- [x] `top-dishes-table.tsx` — cubre: Platos más vendidos — verificación: test con 10 filas y con una sola
- [x] `admin-reports-page.tsx` con carga, error con "Reintentar", sin datos ("No hay ventas en este periodo") y botón "Actualizar" — cubre: Filtros (carga y error), Sin datos — verificación: test de página con la API simulada
- [x] Ruta `/admin/reportes` apuntando a `AdminReportsPage` y retirada del marcador `AdminSectionPage` — cubre: Acceso — verificación: test de ruta y guard; la revisión en navegador queda en la tarea de cierre

## Docs

- [x] Actualizar `docs/diagrama-de-arquitectura.md` y `docs/diagrama-de-base-de-datos.md` (solo texto, las imágenes no cambian)
- [x] Agregar HU-34 a `docs/cronograma.md` (Sprint 3, semana 2) — cubre: Reglas del proyecto — verificación: revisión de los `.md`

## Cierre

- [x] `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build` en verde
- [x] Revisión en navegador (gráficas, contraste de la dona, ancho móvil), repasar cada criterio de `spec.md` y marcar la spec como Hecha — cubre: todos — verificación: ejecución de los comandos y revisión manual en el navegador
