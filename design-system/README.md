Sistema de diseño de la app de pedidos de una cevichería: tema claro, fondos arena y blanco, letras oscuras y acentos pastel en celeste (el mar) y naranja (ají y limón). Se usa para construir pantallas de carta, carrito, pago y seguimiento del pedido.

## Fundamentos de contenido

- Escribe en español neutro y tutea al cliente: "Tu pedido está listo", "Revisa los datos de tu tarjeta". Sin jerga ni regionalismos marcados.
- Tono cálido, breve y directo, como un buen mozo: una idea por frase. Los mensajes de error dicen qué pasó y qué hacer: "No pudimos procesar el pago. Revisa los datos de tu tarjeta e inténtalo de nuevo."
- Mayúscula solo inicial en títulos y botones: "Ceviche clásico", "Confirmar pedido". Los botones empiezan con un verbo: "Agregar al carrito", "Seguir pidiendo".
- Precios en soles con prefijo `S/` y dos decimales: "S/ 32.00".
- Sin emojis. La señal visual de un estado la dan los íconos de notificación, siempre acompañados de texto.

## Fundamentos visuales

### Color

- Pantalla sobre `bg`; tarjetas, inputs, diálogos y toasts sobre `surface`; zonas suaves en `surface-celeste` (información) o `surface-naranja` (promoción).
- Todo el texto va en `ink`; el secundario en `ink-muted`; ayudas y placeholders en `ink-subtle`. Sobre pasteles solo `ink` o el tono oscuro de la misma familia (`celeste-800`, `naranja-700`, `lima-800`, `aji-800`, `coral-800`).
- Celeste = estructura e información; naranja = acción y promoción. Un solo botón primario (`action`) por pantalla; el secundario usa `action-secondary`.
- Lima, ají y coral son solo estados (éxito, advertencia, error) y siempre llevan ícono y palabra: nunca dependas del color solo.
- Bordes decorativos de tarjetas: `border`. Bordes de controles (inputs): `border-strong`, que cumple 3:1. El foco usa `focus-ring` con `shadow-focus`.

### Tipografía

- Títulos en Fredoka (`title-xl`, `title-lg`, `title-md`, `title-sm`, `price`); todo lo demás en Nunito (`body-lg`, `body`, `body-sm`, `label`, `button`, `caption`). Ambas se cargan desde Google Fonts.
- Un `title-lg` por pantalla; los textos de cuerpo en `body` con `ink-muted` para descripciones.

### Espaciado, radios y sombras

- Escala de 4px (`space-1` a `space-16`). Padding lateral de pantalla `space-4`, entre tarjetas `space-3`, entre campos `space-5`, entre secciones `space-8`.
- Controles táctiles de `space-12` (48px) de alto. Inputs y botones con `radius-md`; tarjetas y toasts `radius-lg`; diálogos `radius-xl`; insignias y discos `radius-pill`.
- Sombras suaves y tintadas: `shadow-xs` botones, `shadow-sm` tarjetas, `shadow-md` hover y toasts, `shadow-lg` diálogos. Bordes de `bw-1`, y `bw-2` solo para foco y error.

## Iconografía

- Íconos de notificación (grupo de assets "Notificaciones"): éxito, información, advertencia, error, pedido listo, promoción y campana. Son discos pastel de 48px con un trazo oscuro; se muestran con `<img>` a 40px (toasts) o 56px (diálogos).
- Los íconos de interfaz (buscar, cerrar, alerta) son de trazo de 2px con puntas redondeadas, `currentColor` sobre `ink-muted`.

## Componentes

`Input`, `Button`, `Card`, `Dialog` y `Notification` (Button se añade porque diálogos y formularios lo necesitan). Los estilos de las vistas previas están en `components/bundle.css`.
