# Spec: HT-12 — Aplicar la escala tipográfica del design system en toda la web

**Épica**: [E0. Fundamentos del proyecto](../../docs/epicas.md#e0)
**Estado**: En implementación

## Objetivo

Que todos los textos de la tienda y del panel `/admin` usen la escala tipográfica definida en `design-system/tokens.json`, de modo que un mismo tipo de texto (título de pantalla, título de sección, texto base, precio, etiqueta) tenga el mismo tamaño en todas las pantallas y que ningún texto se vea más grande de lo que el design system indica.

## Contexto (qué ya existe y qué falta)

- `design-system/tokens.json` define la escala en `type.groups`: `title-xl` (32/38), `title-lg` (26/32), `title-md` (22/28), `title-sm` (18/24) y `price` (18/24; era 20/24, ver Decisiones) en Fredoka; `body-lg` (17/26), `body` (15/22), `body-sm` (13/18), `label` (14/20), `button` (15/20) y `caption` (12/16) en Nunito. Cada estilo tiene un uso definido.
- `src/styles/tailwind-theme.css` expone colores, fuentes, radios y sombras del design system, pero **no la escala tipográfica**. Por eso cada pantalla escribe su tamaño a mano: hoy hay 14 tamaños distintos en el frontend, varios fuera de la escala.
- Inconsistencias detectadas:
  - **Títulos de pantalla en 32px** (`title-xl`) en el carrito, el checkout, el detalle del plato, el perfil, el panel y las páginas 404, cuando el design system reserva 32px para la bienvenida o un plato destacado y pide `title-lg` (26px) para el título de cada pantalla. Las pantallas de autenticación (login, registro, recuperar contraseña) sí usan 26px: el mismo tipo de título tiene dos tamaños.
  - **Títulos de sección en 24px** (carrito, pasos del checkout, confirmación del pedido), un tamaño que no existe en la escala (`title-md` es 22px). El panel usa 22px para lo mismo.
  - **Precio del detalle del plato en 28px** y totales del resumen en 24px, cuando `price` es 20px.
  - **Texto base en 16px** (`text-base`, el tamaño más usado: botones, inputs y párrafos), cuando `body` y `button` son 15px.
  - Tamaños sueltos fuera de la escala: 28px en las tarjetas del reporte de ventas, 24px en el logo del header y en el nombre del navegador del panel, 11px en el gráfico de ventas.

## Actor(es)

Visitante, Cliente y Administrador (todas las pantallas de la tienda y del panel).

## Criterios de aceptación

- **Dado** el tema de Tailwind, **cuando** un componente necesita un tamaño de texto, **entonces** existe una utility por cada estilo de la escala (ej. `text-title-lg`, `text-body`, `text-caption`) que aplica su tamaño y su interlineado, tomados de `tokens.json`.
- **Dado** cualquier pantalla de la tienda o del panel, **cuando** miro su título principal, **entonces** usa `title-lg` (26px), igual que las pantallas de autenticación.
- **Dado** cualquier pantalla con secciones (carrito, pasos del checkout, confirmación, perfil, panel), **cuando** miro el título de una sección o de un diálogo, **entonces** usa `title-md` (22px).
- **Dado** una tarjeta de plato, un toast o una fila de lista con nombre destacado, **cuando** miro ese nombre, **entonces** usa `title-sm` (18px).
- **Dado** un precio o un total (tarjetas, detalle del plato, totales del carrito, del resumen y del checkout), **cuando** lo miro, **entonces** usa `price` (18px), en todas las pantallas por igual.
- **Dado** un párrafo, un input o un botón, **cuando** miro su texto, **entonces** usa `body` o `button` (15px); las ayudas y metadatos usan `body-sm` (13px), las etiquetas de inputs `label` (14px) y las insignias `caption` (12px).
- **Dado** el código del frontend, **cuando** se busca un tamaño de texto escrito a mano (`text-[Npx]`) o una utility de tamaño por defecto de Tailwind (`text-xs` … `text-9xl`), **entonces** no aparece ninguno: solo se usan las utilities de la escala.
- **Dado** un tamaño de texto fuera de la escala agregado en un cambio futuro, **cuando** corre la verificación del frontend (lint o tests), **entonces** falla e indica el archivo.
- **Dado** una pantalla en un celular (360px de ancho), **cuando** la recorro, **entonces** ningún título se corta ni desborda su contenedor con los nuevos tamaños.

## Casos borde

- Los códigos del pedido y de entrega (`order-codes`, `delivery-code-box`) se muestran grandes y espaciados para dictarse o copiarse: usan `title-xl` como estilo destacado, no como título de pantalla.
- El logo de texto del header y el nombre del navegador del panel no son títulos de pantalla; deben quedar en un estilo de la escala (propuesta: `title-md`).
- `price` es para el precio de un plato y para los totales. Las líneas de desglose del resumen (subtotal, delivery, descuento) y el precio unitario de cada fila del carrito y del mini carrito siguen el tamaño del texto de su fila (`body` o `body-sm`).
- Los textos del gráfico de ventas (ejes y etiquetas, hoy 11px) usan `caption`.
- Los tests que buscan textos o roles no dependen del tamaño; los que verifican clases concretas se actualizan a las nuevas utilities.

## Fuera de alcance

- Cambiar otros valores de la escala en `tokens.json`: solo cambia `price` (ver Decisiones).
- Cambiar fuentes, colores, espaciados o la disposición de las pantallas.
- Una escala distinta para celular y escritorio (tamaños responsivos).
- Permitir al usuario agrandar o achicar el texto desde la interfaz (el zoom del navegador sigue funcionando como siempre).

## Decisiones (antes preguntas abiertas)

- Partes que se ven grandes: los títulos de pantalla (32px → 26px), los títulos de sección (24px → 22px), los precios y totales (28px y 24px → 20px) y el texto base (16px → 15px). Se corrigen todos.
- El nombre del plato en su detalle usa `title-lg` (26px), como el título de cualquier otra pantalla; `title-xl` queda solo para la bienvenida y los códigos del pedido.
- Para que los tamaños a mano no vuelvan, una regla de lint falla ante `text-[Npx]` y ante las utilities de tamaño por defecto de Tailwind (CI ya corre `pnpm lint`; como oxlint no admite reglas propias por patrón, es un script que `pnpm lint` ejecuta después de oxlint, ver `plan.md`), y `AGENTS.md` (sección Frontend) lo indica igual que para colores y radios.
- Tras revisar el carrito en el navegador, los precios a 20px se veían demasiado grandes: `price` baja a 18px (mismo interlineado de 24px) en `design-system/tokens.json`, `components/bundle.css` y `tokens.css`. El precio unitario de cada fila del carrito usa `body` en `ink-muted`, como las líneas del desglose.
- En el resumen del pedido y en el mini carrito, la etiqueta "Total" usa `body-lg` en negrita y solo el importe usa `price`: con las tres cosas en `title-sm`/`price` (título de la tarjeta, "Total" y el importe) la tarjeta no tenía jerarquía. Con un cupón aplicado, "Quitar" pasa de `Button` a enlace de texto en la misma línea que el código (`body-sm`), ver `specs/hu-42-cupones-de-descuento/plan.md`.
