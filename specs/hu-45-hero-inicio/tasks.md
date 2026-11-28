# Tareas: HU-45 — Imagen principal (hero) de la página de inicio

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Frontend

- [x] Elegir las tres fotos, convertirlas a `hero-N-1200.webp` y `hero-N-2000.webp` en `frontend/public/hero/` — cubre: fotos de ceviche, peso de las fotos — verificación: cada archivo pesa menos de 150 KB.
- [x] Registrar el origen y la licencia de las fotos en `frontend/src/features/home/README.md` — cubre: licencia — verificación: revisión del README.
- [x] `hero-slides.ts` y `use-carousel.ts` — cubre: turno cada 6 s en bucle, elegir foto reinicia el turno, pausa del usuario, retención por cursor o foco, movimiento reducido — verificación: `tests/features/home/use-carousel.test.ts` con temporizadores falsos y `matchMedia` simulado.
- [x] `buttonClassName(variant)` en `components/button-class-name.ts`, usada por `Button` — cubre: botón "Ver la carta" con el aspecto del primario — verificación: los tests de las pantallas que usan `Button` siguen pasando y `tests/components/button.test.tsx` (nuevo) comprueba que `Button` y `buttonClassName` dan las mismas clases por variante.
- [x] `features/home/components/home-hero.tsx` y `home-page.tsx` — cubre: contenido, carrusel (controles y fundido), enlace a `/menu`, `h1`, foto decorativa, fondo de respaldo — verificación: `tests/features/home/home-page.test.tsx` — muestra el `h1` "El sabor del mar en cada plato", el texto y el enlace "Ver la carta" con `href="/menu"`; las fotos tienen `alt=""` y `srcSet` con los dos anchos; los puntos cambian la foto visible y marcan el actual; "Pausar fotos" cambia a "Reanudar fotos" y detiene el turno; pulsar el enlace lleva a `/menu`.

## Documentación

- [x] Agregar HU-45 a `docs/cronograma.md` (Sprint 3, semana 3) — cubre: impacto en documentación — verificación: revisión del `.md`.

## Verificación en navegador y cierre

- [x] Revisar `/` en escritorio (franja de 60–70 %, se asoma lo de abajo, texto legible sobre la foto), en celular (texto sin cortes, botón visible sin bajar) con una foto bloqueada (fondo oscuro, texto legible) y con movimiento reducido activado (no se turnan solas); medir el contraste del texto sobre cada foto — cubre: criterios de contenido, accesibilidad y adaptación.
- [x] Repasar cada criterio de `spec.md`, correr `pnpm lint`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
