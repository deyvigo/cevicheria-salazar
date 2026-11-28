# Spec: HU-45 — Imagen principal (hero) de la página de inicio

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: Hecha

## Objetivo

Que el Visitante que entra a la tienda (`/`) vea una imagen principal (hero) con la propuesta de Salazar SAC y un acceso directo a la carta, en lugar de la página vacía de hoy. Es la primera de varias historias de la página de inicio; las secciones de abajo del hero llegan en historias posteriores.

## Contexto (qué ya existe y qué falta)

- Desde que la carta se movió a `/menu` (HU-07), `/` muestra un `HomePage` vacío "hasta que exista la sección de inicio".
- El encabezado ya tiene el logo (enlace a `/`), "Carta", el buscador, el carrito y la sesión.
- En `frontend/public/` hay una foto de platos (`background.jpg`, 553 × 555 px) que usan las pantallas de login y registro; es pequeña para ocupar el ancho de la pantalla sin verse borrosa.
- El design system define colores, tipografías (Fredoka para títulos, Nunito para texto) y el componente `Button`.

## Actor(es)

Visitante y Cliente (la página de inicio es pública). El Administrador también la ve si entra a la tienda.

## Criterios de aceptación

### Contenido

- **Dado** que abro `/`, **cuando** carga, **entonces** veo arriba un hero con fotos de ceviche a todo el ancho que se turnan (carrusel) y, encima, el título **"El sabor del mar en cada plato"**, el texto **"Ceviches y chicharrones preparados al momento. Haz tu pedido en minutos."** y el botón **"Ver la carta"**.
- **Dado** el hero, **cuando** lo miro en una computadora, **entonces** ocupa una franja alta (alrededor de 60–70 % de la pantalla, debajo del encabezado), de modo que se asome lo que viene debajo.
- **Dado** las fotos de fondo, **cuando** miro el hero, **entonces** tienen un velo oscuro que asegura que el texto blanco se lea sobre cualquiera de ellas.

### Carrusel

- **Dado** el hero, **cuando** lo miro sin tocar nada, **entonces** las tres fotos se turnan cada 6 segundos con un fundido suave, en bucle; el título, el texto y el botón quedan fijos y no se mueven.
- **Dado** los indicadores (un punto por foto), **cuando** miro el hero, **entonces** el punto de la foto visible se distingue de los demás; **cuando** pulso uno, **entonces** se muestra esa foto y el turno de 6 segundos vuelve a empezar.
- **Dado** el botón "Pausar fotos", **cuando** lo pulso, **entonces** las fotos dejan de turnarse y el botón pasa a "Reanudar fotos"; al pulsarlo de nuevo, se reanudan.
- **Dado** que paso el cursor sobre el hero o el foco del teclado está dentro de él, **cuando** sigue ahí, **entonces** las fotos no cambian solas; al salir, se reanudan (salvo que las haya pausado con el botón).
- **Dado** que mi sistema pide reducir el movimiento, **cuando** abro `/`, **entonces** las fotos no se turnan solas ni hay fundido; puedo cambiarlas con los indicadores.
### Comportamiento

- **Dado** el botón "Ver la carta", **cuando** lo pulso, **entonces** voy a `/menu`.
- **Dado** que una foto aún no carga o falla, **cuando** miro el hero, **entonces** el título, el texto y el botón se leen igual (fondo de respaldo con los colores del design system).
### Accesibilidad y adaptación

- **Dado** el título y el texto sobre la foto, **cuando** los leo, **entonces** tienen contraste suficiente (WCAG AA) sobre cualquier parte de la foto.
- **Dado** un lector de pantalla, **cuando** recorre el hero, **entonces** el título es el encabezado principal de la página (`h1`) y las fotos son decorativas (no se anuncian ni se anuncia cada cambio); los indicadores y el botón de pausa tienen nombres accesibles ("Ver foto 2 de 3", "Pausar fotos") y el indicador actual se marca como tal.
- **Dado** una pantalla de celular, **cuando** abro `/`, **entonces** el hero se adapta: el texto no se corta y el botón sigue visible sin desplazarse.

## Casos borde

- **Pantallas muy anchas**: la foto cubre el ancho sin deformarse (se recorta, no se estira).
- **Conexión lenta**: la foto no bloquea la lectura del texto ni el botón.
- **Peso de las fotos**: se guardan optimizadas (anchos de 1200 y 2000 px, WebP, menos de 150 KB cada una) para no frenar la carga; la primera se carga con prioridad y las demás después.

## Fuera de alcance

- Las secciones de debajo del hero (categorías, platos destacados, reseñas, información del local): historias posteriores.
- Editar la foto o los textos desde el panel.
- Fotos propias del local o de sus platos: se reemplazan los archivos cuando existan, sin cambiar la página.
- Flechas de anterior/siguiente o deslizar con el dedo: los puntos bastan para tres fotos.

## Impacto en documentación

- `docs/historias.md`, `docs/epicas.md`: HU-45.
- `docs/cronograma.md`: Sprint 3, semana 3.

## Decisiones de clarificación

- **Fotos**: tres fotos de ceviche libres de stock (licencia de Unsplash: uso comercial sin atribución obligatoria), hasta tener fotos propias, en carrusel con el texto y el enlace fijos encima. Primero el ceviche peruano (Pirata Studio Film), luego el de pescado de cerca (Silvia Trigo) y el de camarones (Yasmine Duchesne). Su fuente y licencia se registran en `frontend/src/features/home/README.md`.
- **Carrusel**: cambio cada 6 segundos con fundido, puntos para elegir foto, botón de pausa (WCAG 2.2.2: todo lo que se mueve solo más de 5 segundos debe poder pausarse) y sin movimiento automático si el sistema pide reducir el movimiento.
- **Diseño**: foto de fondo a todo el ancho con velo oscuro y el texto encima.
- **Altura**: franja alta (alrededor de 60–70 % de la pantalla), no la pantalla completa.
- **Textos**: título "El sabor del mar en cada plato"; texto "Ceviches y chicharrones preparados al momento. Haz tu pedido en minutos."; botón "Ver la carta".

## Preguntas abiertas

Ninguna.
