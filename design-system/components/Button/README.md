Botones de acción de la app. Se incluyen porque diálogos, tarjetas y formularios los necesitan.

- Primario (`action` + `on-action`): una sola acción principal por pantalla o diálogo ("Confirmar pedido", "Agregar al carrito").
- Secundario (`action-secondary`): acciones alternativas de igual peso ("Ver carta").
- Contorno (fondo `surface`, borde `border-strong`): acciones de salida ("Seguir pidiendo", "Cancelar").
- Peligro (`error-surface`, `error-text`, borde `coral-800`): acciones destructivas ("Cancelar pedido").
- Alto `space-12`, padding horizontal `space-6`, radio `radius-md`, texto `button`, sombra `shadow-xs`.
- Foco con `shadow-focus`. Deshabilitado en `surface-disabled`.

Texto en infinitivo o verbo de acción, en mayúscula inicial y sin punto final.
