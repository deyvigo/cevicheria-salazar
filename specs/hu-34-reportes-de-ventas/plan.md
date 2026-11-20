# Plan: HU-34 — Reporte de ventas

`spec.md` en estado Clarificada.

## Backend

### Endpoint (paquete `admin`)

Bajo `/api/admin/reports`, así que ya lo cubre `AdminAccessInterceptor` (`/api/admin/**`): 401 sin sesión, 403 sin rol `ADMINISTRADOR` (comprobado contra la base).

| Método y ruta | Parámetros | Respuesta |
| --- | --- | --- |
| `GET /api/admin/reports/sales` | `from`, `to` (obligatorios, `yyyy-MM-dd`), `payment` (`ONLINE \| EFECTIVO \| YAPE`) y `type` (`ENTREGA \| RECOJO`), opcionales | `200` con `SalesReport` |

Una sola llamada devuelve todo el reporte, para que tarjetas, gráficas y ranking salgan de la misma lectura y la pantalla haga una sola petición por cambio de filtro.

- **Validación** (`FieldInvalidException`, ya existe → `400`): falta `from` o `to`; `from > to` ("La fecha inicial no puede ser posterior a la final."); rango de más de 366 días. Valores desconocidos de `payment` o `type` responden `400` por el enum.
- **`SalesReport`**: `{ granularity, summary, series, byPayment, topDishes }`.
  - `granularity`: `DAY` (hasta 31 días), `WEEK` (32 a 120) o `MONTH` (más de 120), decidida en el servidor.
  - `summary`: `{ revenue, orders, averageTicket, discounts, pendingCollection, pendingRefunds: { count, amount } }`.
  - `series[]`: `{ date, revenue, orders }`, con `date` = inicio del periodo (día, lunes de la semana o día 1 del mes). Incluye los periodos sin ventas en cero.
  - `byPayment[]`: siempre tres filas, `{ method, orders, revenue, percentage }`, en orden Online, Efectivo, Yape.
  - `topDishes[]`: hasta 10, `{ name, units, revenue }`.
- **Sin datos personales**: el reporte solo lleva importes y nombres de plato; nunca clientes, direcciones ni códigos de entrega.

### Reglas de datos (las de la spec, expresadas en SQL)

- **Venta**: `status = 'PAGADO' AND delivery_status NOT IN ('RECHAZADO', 'CANCELADO')`, con `paid_at` dentro del rango. Se agrupa por el día de Lima de `paid_at`: `(paid_at AT TIME ZONE 'America/Lima')::date`. `from` desde 00:00 de Lima y `to` hasta el fin de ese día (`to + 1 día` exclusivo), como `AdminOrderQuery`.
- **Por cobrar**: `status = 'PENDIENTE_COBRO' AND delivery_status NOT IN ('RECHAZADO', 'CANCELADO', 'FALLIDO')`, con `created_at` dentro del rango. La contraentrega que termina mal sigue como `PENDIENTE_COBRO` en la base, por eso el filtro por estado de entrega es necesario.
- **Reembolsos pendientes**: `refund_status = 'PENDIENTE'`, sin rango de fechas, pero sí con los filtros de método y tipo.
- **Método**: `ONLINE` = `payment_method = 'ONLINE'`; `EFECTIVO` y `YAPE` = `payment_method = 'CONTRAENTREGA' AND collection_method = ...`. Es el mismo criterio de `AdminOrderFilter.Payment`, que se reutiliza para no duplicarlo.
- **Ranking**: une `order_items` con los pedidos que cuentan como venta (misma condición y filtros), agrupa por `product_name` (copia guardada en el pedido), ordena por unidades descendente, luego ingresos descendente, luego nombre, y toma 10. Ingresos = suma de `line_total`.

### Capas

- **`AdminReportController`**: ruta, parseo de parámetros y delegación.
- **`AdminReportService`**: valida el rango, elige la granularidad, llama al repositorio, **rellena en Java los periodos sin ventas**, calcula el promedio y reparte los porcentajes. No se usa `generate_series` en SQL: así el relleno se prueba sin base de datos.
  - Porcentajes con el método del mayor resto (`BigDecimal`, un decimal), de modo que sumen 100.0; con ingresos totales en cero, todos en 0.
  - Ticket promedio = `revenue / orders` con `RoundingMode.HALF_UP` a dos decimales; `0.00` sin pedidos.
- **`AdminReportQuery`** (paquete `admin`, junto a `AdminOrderQuery`): consultas SQL nativas con `EntityManager` y parámetros enlazados, que agregan en la base y devuelven filas ya sumadas. Se usa SQL nativo (no Criteria) porque `date_trunc` con zona horaria y los agregados condicionales no se expresan bien en JPA. Una consulta por bloque: serie, método de pago, resumen (ingresos, descuentos, por cobrar y reembolsos) y ranking.
- **DTOs** en `admin/dto`: `SalesReport` y sus registros anidados.
- **`ApiExceptionHandler`**: no hace falta cambiarlo; `FieldInvalidException` ya produce `400`.
- **Zona horaria**: `AdminOrderQuery.LIMA` ya define `America/Lima`; se comparte en lugar de repetirla.

### Base de datos

Sin tablas ni columnas nuevas. Una migración de índices, `V18__sales_report_indexes.sql` (la última existente es `V17`):

```sql
-- Sales report: revenue is grouped by the date the money came in
CREATE INDEX idx_orders_report_paid ON orders (paid_at)
    WHERE status = 'PAGADO';
```

Las demás consultas (por cobrar, reembolsos) recorren un conjunto pequeño y se resuelven con los índices existentes; no se agregan más. Hibernate sigue en `validate`.

## Frontend

### Ruta y estado de la vista

- `admin-sections.ts` ya tiene `reportes`. En `router.tsx`, `reportes` se agrega a las rutas con página propia (`AdminReportsPage`) y se quita de la lista que usa `AdminSectionPage`.
- El estado de la vista (`range`, `from`, `to`, `payment`, `type`) vive en la URL con `useSearchParams`, como `admin-orders-view.ts`. Los valores por defecto (7 días, sin filtros) no se escriben en la URL.
- Los atajos de rango (Hoy, 7 días, 30 días, Este mes, Personalizado) se convierten a `from`/`to` en hora de Lima con los helpers de `admin-orders-view.ts` (`limaDay`), que se mueven a un módulo compartido (`src/lib/lima-dates.ts`) para no duplicarlos; "Este mes" y "30 días" se agregan ahí.

### Pantallas y componentes (`src/features/admin/`)

- **`admin-reports-page.tsx`**: orquesta filtros, tarjetas, gráficas y ranking, con carga, error con "Reintentar" y estado sin datos. Botón "Actualizar" que repite la petición.
- **`components/report-filters.tsx`**: atajos de rango, `Input type="date"` en Personalizado (valida `Desde <= Hasta` y 366 días en el cliente, con el mensaje junto al campo y conservando el filtro anterior) y selectores de método y tipo.
- **`components/report-summary-cards.tsx`**: seis `Card`; "Reembolsos pendientes" muestra cantidad y monto, y una nota "No depende del rango de fechas".
- **`components/sales-bar-chart.tsx`**: gráfica de barras en SVG propio. Etiquetas del eje según la granularidad (día, "Sem. del ...", mes), detalle (fecha, ingreso, pedidos) con cursor, foco de teclado o toque.
- **`components/payment-donut.tsx`**: dona en SVG con el ingreso total en el centro, tabla al lado (método, pedidos, ingresos, porcentaje) y el mismo detalle al pasar el cursor o tocar un segmento.
- **`components/top-dishes-table.tsx`**: tabla de hasta 10 filas.
- **`admin-report-api.ts`**: `getSalesReport(params)` con la instancia `api`; tipos `SalesReport`. **`use-admin-sales-report.ts`**: `useQuery(['admin-sales-report', params])` con `placeholderData: keepPreviousData`.
- Los textos y formatos reutilizan `formatPrice` (`S/ 32.00`) y las etiquetas de método de `order-labels.ts`.

### Gráficas sin librería

No hay librería de gráficas en `package.json` y el reporte necesita solo dos (barras y dona). Se dibujan con SVG y las utilities de Tailwind (`fill-*`, `stroke-*`), de modo que los colores salen de los tokens del `design-system/` y se evita una dependencia nueva de unos cientos de KB. Cada gráfica lleva `role="img"` con un `aria-label` que resume los datos, y la tabla de al lado (o los valores sobre las barras) es la alternativa accesible. Los colores de los tres segmentos de la dona se eligen de los tokens existentes y no dependen solo del color: la tabla los identifica con su nombre y un cuadro de color.

### Design system

`Card`, `Button` e `Input` ya existen. Sin tokens nuevos. No hay referencia visual de gráficas en `design-system/`; se construyen con tokens de color y tipografía existentes (Fredoka en títulos, Nunito en etiquetas).

## Seguridad

- Rol `ADMINISTRADOR` por `AdminAccessInterceptor`; el guard del frontend es solo UX.
- Todos los parámetros se validan (fechas, enums, rango máximo) y se pasan enlazados a la consulta, nunca concatenados.
- Rango máximo de 366 días: evita que una petición agregue años de pedidos por descuido.
- La respuesta no incluye datos de clientes.

## Decisiones

- **Un solo endpoint**: una lectura consistente y una petición por cambio de filtro, en vez de cinco que podrían ver datos distintos.
- **SQL nativo con agregados**: se calcula en la base con `NUMERIC`; no se traen pedidos al servidor.
- **Relleno de días vacíos en Java**: más fácil de probar que `generate_series` y no depende del dialecto.
- **SVG propio en vez de librería**: dos gráficas simples; evita una dependencia y respeta los tokens. Si luego hay más gráficas, se reevalúa.
- **Sin tiempo real**: el reporte se pide al abrir o al pulsar "Actualizar"; no se engancha al SSE de pedidos (fuera de alcance en la spec).
- **Rutas en inglés**: `/api/admin/reports/sales`; la URL del panel sigue en español (`/admin/reportes`).
- **Reembolsos pendientes sin rango**: es deuda vigente, no un resultado del periodo.

## Impacto en docs/

- `docs/diagrama-de-arquitectura.md`: agregar el reporte de ventas entre los controladores del panel y las consultas agregadas sobre PostgreSQL.
- `docs/diagrama-de-base-de-datos.md`: mencionar el índice de `V18__sales_report_indexes.sql` en la descripción de `orders`. No hay tablas ni columnas nuevas.
- `docs/cronograma.md`: agregar HU-34 al sprint donde se planifique (hoy no figura en ninguno).
