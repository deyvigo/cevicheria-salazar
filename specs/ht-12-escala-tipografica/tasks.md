# Tareas: HT-12 — Aplicar la escala tipográfica del design system en toda la web

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Frontend

- [x] Agregar las variables de la escala en `src/styles/tokens.css`, mapearlas en `@theme` de `tailwind-theme.css` (con `--text-*: initial`) y aplicar `body` al `body` en `global.css` — cubre: una utility por estilo de la escala con su tamaño e interlineado — verificación: `pnpm build` en verde y, en el CSS generado (`dist/assets/*.css`), `.text-title-lg` con `font-size: var(--text-title-lg)` e interlineado de 32px, y sin reglas para `.text-sm` ni `.text-base`; los valores coinciden uno a uno con `type.groups` de `design-system/tokens.json`.
- [x] Crear `scripts/check-type-scale.mjs` y sumarlo a `pnpm lint` — cubre: un tamaño fuera de la escala hace fallar la verificación e indica el archivo — verificación: antes de migrar, `pnpm lint` falla y lista `archivo:línea` de los tamaños a mano (ej. `src/components/button.tsx` con `text-base`); un archivo de prueba temporal con `sm:text-[19px]` o `style={{ fontSize: 19 }}` también falla; `src/styles/` no se reporta.
- [x] Migrar los componentes compartidos de `src/components/` (`button`, `input`, `dialog`, `card`, `notification`, `header`, `pagination`, `search-box`, `switch`, `not-found`, `logout-notice`) — cubre: botones e inputs en 15px, etiquetas en `label`, ayudas en `body-sm`, título del diálogo en `title-md`, logo en `title-md`, título del 404 en `title-lg` — verificación: `pnpm test --run` en verde y el script ya no reporta `src/components/`.
- [x] Migrar `features/auth` y `features/catalogo` (carta, tarjetas de plato, detalle, búsqueda, destacados, reseñas) — cubre: títulos de pantalla en `title-lg` (incluido el nombre del plato), nombres de plato en tarjetas en `title-sm`, precios en `price`, tags en `caption` — verificación: `pnpm test --run` y el script sin reportes en esas carpetas.
- [x] Migrar `features/carrito` y `features/checkout` (carrito, mini carrito, resumen, pasos Entrega y Pago, cupón, resultado y confirmación) — cubre: títulos de sección de 24px a `title-md`, totales en `price`, códigos del pedido en `title-xl` — verificación: `pnpm test --run` y el script sin reportes en esas carpetas.
- [x] Migrar `features/perfil` (Mi información, Mis direcciones, Mis pedidos, detalle del pedido, código de entrega) — cubre: títulos de pantalla y de sección, precios, código de entrega en `title-xl` — verificación: `pnpm test --run` y el script sin reportes en esa carpeta.
- [x] Migrar `features/admin` (navegación, platos, categorías, pedidos, zonas, reportes, tarjetas de resumen y gráfico de ventas) — cubre: títulos de pantalla del panel en `title-lg`, nombre del navegador en `title-md`, cifras del reporte en `price`, ejes del gráfico en `caption` — verificación: `pnpm test --run` y `pnpm lint` completo en verde (sin ningún tamaño a mano en `src/`).
- [x] Ajustar los tests que dependan de clases de tamaño, si alguno falla — cubre: los tests no dependen del tamaño — verificación: `pnpm test --run` en verde.

## Documentación

- [x] Agregar en `AGENTS.md` (sección Frontend) la regla de tamaños de texto con las utilities de la escala y la verificación de `pnpm lint` — cubre: impacto en documentación — verificación: revisión del `.md`.

## Verificación en navegador y cierre

- [ ] Recorrer en escritorio la tienda (inicio, carta, detalle, carrito, mini carrito, Entrega, Pago, resultado, login, registro, perfil, 404) y el panel (platos, categorías, pedidos, zonas, reportes, Mi información) — cubre: mismo tamaño para títulos de pantalla, de sección, precios y texto en todas las pantallas — verificación: comparar a la vista cada tipo de texto entre pantallas y con `design-system/components/*/preview.html`. Avance: revisados con capturas carta, detalle del plato, login, carrito y 404; faltan las pantallas con sesión (checkout, perfil y panel).
- [ ] Repetir el recorrido a 360px de ancho — cubre: ningún título se corta ni desborda — verificación: herramientas de desarrollo del navegador en modo celular. Avance: carta y detalle revisados, los títulos caben; el header ya se desborda a 360px en `develop`, antes de esta historia, y queda fuera de alcance.
- [ ] Repasar cada criterio de `spec.md`, correr `pnpm lint`, `pnpm test --run` y `pnpm build` (sin cambios de backend) y pasar la spec a **Hecha** — cubre: cierre.
