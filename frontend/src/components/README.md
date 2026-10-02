Wrappers en React de los componentes del `design-system/` (`Button`, `Input`, `Card`, `Dialog`, `Notification`), construidos con **utilities de Tailwind** en vez de las clases `cv-*` del design system.

Los tokens de `design-system/tokens.json` están disponibles como utilities de Tailwind (ver `src/styles/tailwind-theme.css`): colores (`bg-action`, `text-ink`, `text-ink-muted`, ...), radios (`rounded-md`, `rounded-lg`, ...), sombras (`shadow-sm`, `shadow-focus`, ...) y tipografía (`font-display`, `font-body`). El espaciado usa la escala por defecto de Tailwind, que ya coincide con la del design system (`p-4` = 16px, `p-6` = 24px, etc.).

Para el aspecto visual exacto de cada componente (estados, tamaños, reglas de uso), seguir `design-system/components/<Componente>/README.md` y comparar contra su `preview.html`, pero implementando con `className` de Tailwind en vez de copiar `bundle.css`.
