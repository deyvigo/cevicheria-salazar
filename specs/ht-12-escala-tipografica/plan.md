# Plan: HT-12 — Aplicar la escala tipográfica del design system en toda la web

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios.

## Frontend

### Escala como utilities de Tailwind

- `src/styles/tokens.css`: agregar las variables de la escala de `design-system/tokens.json` (`type.groups`), una por propiedad y estilo, igual que los colores: `--type-title-xl-size: 32px`, `--type-title-xl-line-height: 38px`, `--type-title-xl-weight: 600`, …, `--type-caption-letter-spacing: 0.02em`. Llevan el prefijo `--type-` y no `--text-` porque `@theme` publica sus propias variables `--text-*` en `:root` y `--text-title-lg: var(--text-title-lg)` sería circular.
- `src/styles/tailwind-theme.css`: en `@theme`, quitar los tamaños por defecto de Tailwind con `--text-*: initial` y mapear los 11 estilos usando las subpropiedades de Tailwind v4 (`--text-<nombre>`, `--text-<nombre>--line-height`, `--text-<nombre>--font-weight` y, en `caption`, `--text-<nombre>--letter-spacing`):

  | Utility           | Tamaño / interlineado | Peso | Familia (clase aparte) |
  | ----------------- | --------------------- | ---- | ---------------------- |
  | `text-title-xl`   | 32 / 38               | 600  | `font-display`         |
  | `text-title-lg`   | 26 / 32               | 600  | `font-display`         |
  | `text-title-md`   | 22 / 28               | 600  | `font-display`         |
  | `text-title-sm`   | 18 / 24               | 600  | `font-display`         |
  | `text-price`      | 18 / 24               | 600  | `font-display`         |
  | `text-body-lg`    | 17 / 26               | 400  | `font-body`            |
  | `text-body`       | 15 / 22               | 400  | `font-body`            |
  | `text-body-sm`    | 13 / 18               | 400  | `font-body`            |
  | `text-label`      | 14 / 20               | 700  | `font-body`            |
  | `text-button`     | 15 / 20               | 700  | `font-body`            |
  | `text-caption`    | 12 / 16 (+0.02em)     | 700  | `font-body`            |

  La utility trae tamaño, interlineado y peso; la familia sigue en `font-display` (Fredoka) porque el cuerpo ya hereda Nunito de `body`. Al migrar se quitan los `leading-*` y `font-semibold`/`font-bold` que repiten lo que ya trae la utility; se conserva un peso explícito solo cuando cambia el del estilo (ej. un error en `body-sm` en negrita).
- `src/styles/global.css`: el `body` toma el estilo `body` (`font-size: var(--type-body-size)`, `line-height: var(--type-body-line-height)`), así el texto sin clase también queda en 15px.

### Regla para elegir el estilo (migración)

| Hoy                                                    | Pasa a                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `text-[32px]` en el título (`h1`) de una pantalla      | `text-title-lg` (incluido el nombre del plato en su detalle) |
| `text-[26px]` (pantallas de autenticación)             | `text-title-lg`                                            |
| `text-[24px]` / `text-[22px]` en títulos de sección (`h2`), del diálogo y del formulario de zona | `text-title-md` |
| `text-[32px]` en los códigos del pedido y de entrega   | `text-title-xl` (único uso de este estilo, con su `tracking`) |
| `text-[24px]` en el código del pedido (`order-codes`)  | `text-title-md`                                            |
| `text-[28px]`, `text-[24px]`, `text-[20px]`, `text-xl` en precios y totales | `text-price`                          |
| Importes de las líneas de desglose (subtotal, delivery, descuento) y precio unitario de las filas del carrito y del mini carrito | `text-body` / `text-body-sm`, como el texto de su fila |
| `text-[28px]` en las cifras de las tarjetas del reporte | `text-price`                                              |
| `text-[24px]` en el logo del header y el nombre del navegador del panel | `text-title-md`                           |
| `text-[18px]`, `text-lg` en nombres de plato, títulos de tarjeta o de toast | `text-title-sm`                       |
| `text-base` en botones (`Button`, botones de texto)    | `text-button`                                              |
| `text-base` en párrafos, inputs y celdas               | `text-body`                                                |
| `text-sm` en negrita como etiqueta de un campo o filtro | `text-label`                                              |
| `text-sm` / `text-[13px]` en ayudas, errores, metadatos y texto de apoyo | `text-body-sm`                          |
| `text-xs`, `text-[11px]` en insignias, tags y ejes del gráfico | `text-caption`                                     |
| `text-2xl` y otros tamaños por defecto                 | el estilo que corresponda a su uso según `tokens.json`     |

Ante un caso dudoso manda el `usage` de `tokens.json` y la guía del componente en `design-system/components/` (Card: `title-sm`, `body`, `price`, `caption`; Dialog: `title-md`, `body`; Input: `label`; Notification: `title-sm`, `body-sm`).

### Pantallas y componentes

Unos 99 archivos de `src/` usan tamaños a mano. Se migran por grupos para revisar cada uno en el navegador:

- Componentes compartidos (`src/components/`): `button`, `input`, `dialog`, `card`, `notification`, `header`, `pagination`, `search-box`, `switch`, `not-found`, `logout-notice`.
- Features: `auth`, `catalogo`, `carrito`, `checkout`, `perfil`, `admin` (incluye `sales-bar-chart` y `report-summary-cards`).

No cambian rutas, comportamiento ni componentes del design system: solo clases de texto.

### Guardia contra tamaños a mano

- `frontend/scripts/check-type-scale.mjs`: recorre `src/**/*.{ts,tsx,css}` y falla (código de salida 1) si encuentra `text-[<n>px|rem|em]`, una utility de tamaño por defecto de Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl` … `text-9xl`, con o sin variante como `sm:`/`hover:`) o un `font-size` / `fontSize` literal. Imprime `archivo:línea` y la clase encontrada. Excluye `src/styles/` (donde vive la escala).
- `package.json`: `"lint": "oxlint && node scripts/check-type-scale.mjs"`. CI ya corre `pnpm lint` en `frontend.yml`, así que no cambia el workflow.

## Seguridad

Sin impacto.

## Decisiones

- **La guardia es un script dentro de `pnpm lint`, no una regla de oxlint**: oxlint no permite reglas propias por patrón de texto sin plugins experimentales. Para quien desarrolla y para CI es lo mismo: `pnpm lint` falla e indica el archivo.
- **`--text-*: initial`**: quitar los tamaños por defecto hace que `text-sm` deje de generar CSS; junto con el script evita que vuelvan sin que nadie lo note.
- **La utility incluye el peso**: el estilo del design system es tamaño + interlineado + peso; así `text-label` o `text-title-sm` se ven igual en todas partes sin repetir `font-bold`.
- **Escala única para celular y escritorio**: la spec deja fuera los tamaños responsivos; los títulos más grandes ahora son de 26px, que caben a 360px de ancho.

## Impacto en docs/

- `AGENTS.md` (sección Frontend): los tamaños de texto solo con las utilities de la escala (`text-title-lg`, `text-body`, …); nunca `text-[Npx]` ni los tamaños por defecto de Tailwind; `pnpm lint` lo verifica.
- `docs/historias.md` y `docs/epicas.md`: ya registran HT-12. `docs/cronograma.md`: se agrega cuando se asigne a un sprint.
- Sin cambios en diagramas de arquitectura, despliegue ni base de datos. `design-system/tokens.json` no cambia.
