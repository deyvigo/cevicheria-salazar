Diálogo modal centrado para confirmar un pedido, avisar de un error o pedir una decisión.

Qué entrega quien lo usa: un ícono de notificación (según el estado), un título corto en forma de pregunta o hecho, una frase de apoyo y de una a dos acciones.

- Fondo `surface`, radio `radius-xl`, padding `space-6`, sombra `shadow-lg`, ancho máximo 320px y texto centrado.
- Sobre un `scrim`; tocar el scrim o la tecla Escape lo cierra, salvo en errores de pago.
- Ícono de 56px arriba con `space-4` de margen; título `title-md` en `ink`; texto `body` en `ink-muted`.
- Botones apilados con `space-3`: primario arriba ("Confirmar pedido") y secundario o contorno abajo ("Seguir pidiendo").
- Mover el foco al diálogo al abrir y devolverlo al cerrar.

Hacer: un solo botón primario; título que diga qué pasó o qué se decide. No hacer: más de dos acciones ni texto largo; los errores siempre explican el siguiente paso.
