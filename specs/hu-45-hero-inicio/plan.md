# Plan: HU-45 — Imagen principal (hero) de la página de inicio

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios: el hero es contenido fijo del frontend.

## Frontend

### Fotos

- Tres fotos de Unsplash (licencia de Unsplash), en orden: `YmC1_EP6TJQ` (ceviche peruano, Pirata Studio Film), `7YXOqZDhhG0` (ceviche de pescado, Silvia Trigo) y `mFmI0dHyF7k` (ceviche de camarones, Yasmine Duchesne).
- Guardadas en `frontend/public/hero/` como `hero-N-1200.webp` y `hero-N-2000.webp` (WebP calidad 72, convertidas con `sips` + `cwebp`; los originales no se versionan).
- Autor, enlace y licencia de cada una en `frontend/src/features/home/README.md` (nuevo), con la nota de que basta reemplazar los archivos para cambiarlas.

### Componentes

- `features/home/hero-slides.ts` (nuevo): la lista de fotos (`src` por ancho) y el intervalo (`HERO_INTERVAL_MS = 6000`), separada del componente para que los tests la usen.
- `features/home/use-carousel.ts` (nuevo): hook con el índice actual, `goTo(index)` (reinicia el turno), `paused` / `togglePaused` (pausa del usuario) y `hold(boolean)` (pausa temporal por cursor o foco). Avanza con `setTimeout` mientras no esté pausado, retenido ni con movimiento reducido (`matchMedia('(prefers-reduced-motion: reduce)')`, escuchando cambios).
- `features/home/components/home-hero.tsx` (nuevo):
  - `<section aria-labelledby>` con altura `min-h-[60svh]` y `lg:min-h-[70svh]`, contenido dentro del ancho del sitio (`max-w-6xl`, `px-6`). `onMouseEnter`/`onMouseLeave` y `onFocus`/`onBlur` (con `relatedTarget`) llaman a `hold`.
  - Fondo de respaldo `bg-ink`; las fotos apiladas en `absolute inset-0` como `<img alt="">` con `srcSet`/`sizes`, `object-cover` y opacidad 0/100 con `transition-opacity duration-700 motion-reduce:transition-none`; la primera con `fetchPriority="high"`, las demás con `loading="lazy"` y `fetchPriority="low"`. El contenedor de fotos lleva `aria-hidden`.
  - Velo `bg-linear-to-r from-ink/80 via-ink/55 to-ink/20` en escritorio y `bg-ink/60` en celular.
  - `h1` "El sabor del mar en cada plato" (`font-display text-title-xl text-surface`), párrafo (`text-body-lg text-surface`) y el enlace "Ver la carta" a `/menu` con el aspecto del botón primario.
  - Controles abajo: un botón por foto (puntos, `aria-label` "Ver foto N de 3", `aria-current` en el actual) y el botón "Pausar fotos"/"Reanudar fotos", que cambia de nombre en vez de usar `aria-pressed`. Contraste del punto inactivo con `surface` al 50 %, activo `surface` sólido y más ancho.
- **Enlace con aspecto de botón**: `components/button-class-name.ts` (nuevo) exporta `buttonClassName(variant)` con las clases que hoy arma `Button`, y `Button` la usa (en un archivo aparte para no romper el fast refresh de `button.tsx`); así el `Link` comparte el estilo sin anidar un `<button>` dentro de un `<a>`.
- `features/home/home-page.tsx`: el `<main>` deja de estar vacío y renderiza `HomeHero` arriba, a todo el ancho; las secciones futuras irán debajo.

### Design system

- Tipografías y tamaños solo de la escala (`text-title-xl`, `text-body-lg`, `text-button`); `pnpm lint` lo verifica.
- Colores: `ink` (velo y respaldo, con opacidad, como ya se usa en `auth-shell.tsx`), `surface` (texto claro) y el botón primario. No se agregan tokens.
- Contraste: el texto `surface` sobre `ink` al 55 % o más supera 4.5:1 incluso sobre las zonas más claras de la foto; se verifica en el navegador con la foto elegida.

## Decisiones

- **Fotos estáticas en `public/`** y no en Garage: no la gestiona el administrador en esta historia, y así no depende del almacenamiento de objetos.
- **`<img>` con `srcSet` en lugar de `background-image`**: el navegador elige el ancho adecuado (celular vs. escritorio) y se puede priorizar la primera.
- **Carrusel propio** en lugar de una librería: son tres fotos con fundido y puntos; un hook pequeño basta y no suma dependencias.
- **Fotos decorativas sin región `aria-live`**: el mensaje del hero es el texto fijo; anunciar cada cambio de foto solo sería ruido.
- **Título con `text-title-xl`** (32 px), el mayor de la escala: no se crea un tamaño especial para el hero.

## Impacto en docs/

- `docs/historias.md` y `docs/epicas.md`: ya registran HU-45.
- `docs/cronograma.md`: Sprint 3, semana 3.
- `frontend/src/features/home/README.md`: nuevo, con el origen y la licencia de las fotos.
