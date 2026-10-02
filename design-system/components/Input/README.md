Campo de texto de una línea (y área de texto) para formularios de pedido: nombre, dirección, teléfono, cupón y búsqueda.

Qué entrega quien lo usa: una etiqueta visible (`label`, siempre fuera del campo, nunca solo placeholder), el valor, y opcionalmente un texto de ayuda o error bajo el campo.

- Alto mínimo `space-12` (48px), padding horizontal `space-4`, radio `radius-md`, texto `body` en `ink`.
- Borde en reposo `border-strong` de `bw-1`; en hover `ink-muted`.
- Foco: borde `focus-ring` más halo `celeste-200`. Nunca quitar el foco.
- Error: borde `coral-800` y mensaje `error-text` con ícono de alerta y texto que diga qué corregir. No comunicar el error solo con color.
- Éxito: borde `lima-800` y mensaje con ícono de check y la palabra de confirmación.
- Deshabilitado: fondo `surface-disabled`, texto `ink-disabled`.
- Separar un campo de otro con `space-5`; etiqueta a campo `space-2`.
- Placeholder en `ink-subtle`: solo ejemplos ("Ej. María Quispe"), nunca instrucciones críticas.

Hacer: etiquetas cortas con mayúscula inicial; mensajes de error que expliquen la solución. No hacer: placeholders como etiqueta, bordes `border` (decorativo) en inputs, texto de error solo en rojo.
