Contenedor para platos, promociones, resúmenes y cualquier bloque de información agrupada.

Qué entrega quien lo usa: contenido ya jerarquizado (título `title-sm` o `card__title`, texto `body` en `ink-muted`, precio `price`) y, si es tocable, una acción clara.

- Base: fondo `surface`, borde `bw-1` en `border`, radio `radius-lg`, padding `space-4`, sombra `shadow-sm`.
- Si la tarjeta es tocable: hover con `shadow-md` y foco con `shadow-focus`.
- Variantes planas (sin sombra): `celeste` para información y `naranja` para promociones, con borde `celeste-200` / `naranja-200`.
- Separación entre tarjetas: `space-3`. Dentro: título, texto y pie separados por `space-1` y `space-4`.
- Etiquetas (tags) en `caption`: `promo-surface` + `promo-text` para destacados; `info-surface` + `info-text` para información.

Hacer: un solo precio y una sola acción por tarjeta. No hacer: sombras junto con bordes de color intenso, ni anidar tarjetas.
