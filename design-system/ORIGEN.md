# Origen de este design system

Copia local de contenido del Design System "Cevichería" creado como Artifact de Claude:
https://claude.ai/artifact/FaPHp34ZB3vXzfC1c4Cgdm

- Sincronizado por última vez: 2026-10-02.
- Cambio local posterior (HT-12): el estilo `price` bajó de 20px a 18px en `tokens.json` y `components/bundle.css`. Llevarlo al Artifact en la próxima sincronización para no perderlo.
- Esta carpeta es la referencia que usará el frontend (colores, tipografía, espaciado, componentes base e iconos de notificación).
- Si el design system se sigue editando en el Artifact, vuelve a pedir una sincronización para traer los cambios nuevos a esta carpeta.

## Contenido

- `README.md`: brand book (contenido, color, tipografía, espaciado, iconografía, componentes).
- `tokens.json`: tokens de diseño (colores, tipografía, espaciado, radios, sombras, anchos de borde).
- `design-system.json`: índice del sistema (título, namespace, grupos de assets).
- `components/`: `bundle.css` con los estilos de cada componente, y por componente (`Button`, `Card`, `Cover`, `Dialog`, `Input`, `Notification`) su `README.md` de guidelines y `preview.html` de ejemplo.
- `assets/Notificaciones/`: los 7 íconos SVG de notificación (éxito, información, advertencia, error, pedido listo, promoción, campana) y su `README.md`.
