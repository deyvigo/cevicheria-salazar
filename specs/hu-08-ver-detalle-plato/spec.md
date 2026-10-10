# Spec: HU-08 — Ver el detalle de un plato

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente pueda abrir un plato desde el catálogo y ver su información completa (fotos, descripción, precio y calificación) para decidir si lo pide. La navegación desde la tarjeta al detalle se anima con una *view transition*: la imagen del plato "viaja" de la tarjeta a su lugar en el detalle, de modo que se percibe que es el mismo plato y no una página nueva.

## Contexto (qué ya existe y qué falta)

HU-07 dejó el modelo de datos del catálogo (`products`, `categories`, `product_images`), la pantalla `/{category}` con la grilla de tarjetas y `GET /api/products?category=`. Las tarjetas hoy no son tocables ("navegar al detalle al hacer clic" quedó explícitamente para esta historia) y `ProductResponse` ya incluye `description`. El modelo admite varias imágenes por plato (`position`), pero la tarjeta solo muestra la primera: la galería es de esta historia.

Esta historia no agrega campos al modelo de datos.

## Actor(es)

Visitante y Cliente. El detalle es público: no requiere iniciar sesión.

## Pantalla

Ruta propuesta: `/products/{id}`. Bajo el header de la app, de izquierda a derecha (escritorio):

- **Columna izquierda**: imagen principal grande y, debajo, miniaturas si el plato tiene más de una imagen.
- **Columna derecha**: enlace "Volver" (a la categoría del plato), categoría, nombre, calificación, precio (`S/ 32.00`) y descripción completa.

No hay botón "Agregar al carrito" ni indicador de agotado en esta historia (HU-12 y HU-10); el espacio queda reservado en la columna derecha, bajo el precio.

## Criterios de aceptación

- **Dado** que veo la grilla de una categoría, **cuando** hago clic en cualquier parte de una tarjeta de plato, **entonces** navego a `/products/{id}` de ese plato.
- **Dado** que abro el detalle de un plato, **cuando** carga la pantalla, **entonces** veo su imagen principal, nombre, categoría, precio con formato `S/ 32.00`, calificación (sin estrellas si no tiene) y la descripción completa.
- **Dado** que el plato tiene más de una imagen, **cuando** abro el detalle, **entonces** veo la imagen de menor `position` como principal y una miniatura por imagen; **y cuando** hago clic en una miniatura, **entonces** pasa a ser la imagen principal.
- **Dado** que el plato tiene una sola imagen, **cuando** abro el detalle, **entonces** no se muestran miniaturas.
- **Dado** que el plato no tiene imágenes (o una imagen no carga), **cuando** abro el detalle, **entonces** se muestra la imagen de reemplazo del catálogo, igual que en la tarjeta.
- **Dado** que hago clic en una tarjeta del catálogo, **cuando** el navegador soporta *view transitions* y no tengo activada la preferencia de movimiento reducido, **entonces** la imagen de esa tarjeta se anima hasta la posición y tamaño de la imagen principal del detalle, y el resto de la pantalla hace un cruce de opacidad breve.
- **Dado** que estoy en el detalle al que llegué desde el catálogo, **cuando** vuelvo (botón "Volver" o atrás del navegador), **entonces** la imagen se anima de regreso hacia la tarjeta de ese plato en la grilla, y la grilla está en la misma categoría, página y orden en que la dejé.
- **Dado** que el navegador no soporta *view transitions* o tengo activado el movimiento reducido, **cuando** navego entre catálogo y detalle, **entonces** la navegación ocurre igual, sin animación y sin error.
- **Dado** que abro `/products/{id}` directamente (enlace compartido, recarga o pestaña nueva), **cuando** carga, **entonces** veo el detalle completo sin animación de entrada.
- **Dado** que estoy en el detalle sin haber pasado por el catálogo, **cuando** hago clic en "Volver", **entonces** voy a la categoría del plato (`/{slug}`), en su página 1 y con el orden por defecto.
- **Dado** que un plato está inactivo (`active = false`), **cuando** abro su categoría, **entonces** no aparece en el catálogo (regla de HU-07, que esta historia no cambia), y por lo tanto no hay forma de llegar a su detalle desde la grilla.
- **Dado** que abro `/products/{id}` de un plato inexistente o inactivo (`active = false`), **cuando** carga, **entonces** veo el mensaje "No encontramos este plato" con un enlace para volver al catálogo. No hay redirección ni se revela si el plato existe pero está inactivo.
- **Dado** que no he iniciado sesión, **cuando** abro cualquier detalle, **entonces** lo veo igual (endpoint público).

## Casos borde

- **Elemento compartido único**: la animación solo identifica una imagen a la vez. Dos tarjetas nunca comparten identificador de transición; solo la tarjeta clicada (o la de destino al volver) lo tiene. Si el plato de origen ya no está en la grilla (por ejemplo, tras cambiar de página), el regreso se hace con el cruce de opacidad, sin viaje de imagen.
- **No bloquear por la red**: la animación no espera al servidor. El detalle muestra de inmediato lo que ya se conoce de la tarjeta (imagen, nombre, precio, calificación) y completa el resto cuando llega la respuesta; la imagen no debe "saltar" al llegar los datos.
- **Imagen aún no cargada**: si la imagen principal no terminó de cargar al iniciar la transición, la animación usa la misma URL que la tarjeta (ya en caché), así que no hay parpadeo.
- **Plato desactivado mientras se navega**: si el plato pasó a inactivo entre el listado y el clic, el detalle muestra "No encontramos este plato".
- **`id` no numérico** (`/products/abc`) o fuera de rango: mismo mensaje que un plato inexistente; no hay pantalla de error.
- **Descripción larga**: se muestra completa, con salto de línea natural; no se trunca ni se recorta el layout.
- **Colisión de rutas**: `products` no puede usarse como `slug` de categoría (se suma a la lista de nombres reservados de HU-07). La ruta de dos segmentos no choca con `/{category}`.
- **Teclado y lector de pantalla**: la tarjeta es un enlace real (se activa con Enter, tiene foco visible); al cargar el detalle, el foco queda en el encabezado con el nombre del plato.
- **Cambio de imagen por miniatura**: no dispara la transición compartida; solo cambia la imagen principal.

## Fuera de alcance

- Agregar al carrito desde el detalle (HU-12), nota para el plato (HU-15), indicador de agotado (HU-10) y platos destacados (HU-11).
- Búsqueda por nombre (HU-09).
- Reseñas, comentarios o cómo se calcula el `rating` (no hay reseñas en el backlog).
- Editar el plato desde el panel `/admin` (HU-29).
- Zoom o pantalla completa de la imagen.
- Navegar al plato anterior/siguiente desde el detalle.
- Layout para celular: se define en una iteración posterior, igual que HU-07.
- Animar otras navegaciones de la app (login, registro, etc.); esta historia solo anima catálogo ↔ detalle.

## Decisiones de clarificación

- **Ruta**: `/products/{id}`, independiente del slug de categoría.
- **Elementos compartidos**: imagen, nombre y precio; el resto, cruce de opacidad. Si el nombre se ve mal al cambiar de tamaño, se reduce a solo la imagen.
- **Duración**: ~300 ms con la curva de salida estándar del design system (`ease-out` si `tokens.json` no define una).
- **Sin soporte de *view transitions***: el navegador navega normal, sin animación y sin polyfill.
- **Plato inactivo**: nunca aparece en el catálogo ni es accesible por su detalle (mismo mensaje que un plato inexistente).
- **Calificación**: estrella + número, igual que en la tarjeta; sin cantidad de reseñas (no existen).
- **Plato inexistente**: texto "No encontramos este plato".
