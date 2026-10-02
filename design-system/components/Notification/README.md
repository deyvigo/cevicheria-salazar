Íconos de notificación, toasts y la campana con insignia: la voz de la app cuando algo cambia en el pedido.

Qué entrega quien lo usa: el tipo de mensaje (éxito, información, advertencia, error, pedido listo, promoción), un título corto y una línea de apoyo. Los íconos están en el grupo de assets "Notificaciones" (SVG de 48px con disco pastel); se muestran con `<img>`.

- Cada tipo usa su ícono y su par pastel/oscuro: éxito `lima`, información `celeste`, advertencia `aji`, error `coral`, pedido y promoción `naranja`.
- Todo toast lleva ícono, título y texto: el significado nunca depende solo del color (apto para daltonismo).
- Toast: fondo del tipo (`success-surface`, `info-surface`, `warning-surface`, `error-surface`, `promo-surface`), borde `bw-1` del pastel 300, radio `radius-lg`, padding `space-4`, sombra `shadow-md`, ancho máximo 380px.
- Título `title-sm` o 16px en `ink`; texto `body-sm`/14px en `ink-muted`. Botón de cerrar de 32px.
- Insignia de contador: `naranja-500` con texto `ink`, borde de `bg` de 2px, esquina superior derecha de la campana. Para más de 9 mostrar "9+".
- Duración sugerida: éxito e información 4 s; advertencia 6 s; error permanece hasta cerrarse.

Hacer: títulos en afirmación ("Tu pedido está listo"). No hacer: emojis, ni mostrar dos toasts a la vez del mismo tipo.
