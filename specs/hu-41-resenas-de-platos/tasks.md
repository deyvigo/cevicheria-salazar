# Tareas: HU-41 — Reseñas de platos

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

- [x] Migración `V17__product_reviews.sql` (tabla, unicidad, índice, `rating` derivado) y `Review` + `ReviewRepository` — cubre: una reseña por cliente y plato, autor "Cliente" si se elimina la cuenta — verificación: `ProductReviewIT` (unicidad, orden `created_at DESC`)
- [x] Regla de compra en `OrderRepository` y `ReviewService.canReview` — cubre: reseñar solo con pedido `ENTREGADO` — verificación: `ProductReviewIT` (entregado sí; pendiente, en curso, cancelado, rechazado, fallido y pedido ajeno no)
- [x] `ReviewService` upsert/eliminar con recálculo del promedio y `reviewCount` — cubre: crear, editar, eliminar, plato vuelve a `rating NULL`, comentario opcional y recortado — verificación: `ProductReviewIT`
- [x] `ReviewController` (`GET` lista, `GET/PUT/DELETE mine`), excepciones y `SecurityConfig` — cubre: lectura pública, 403 sin compra, 401 sin sesión, 404 plato inexistente/inactivo, validación 1-5 y 500 caracteres — verificación: `./mvnw test -Dtest='ProductReviewIT'`
- [x] Lista paginada de 10 con `authorName` de primer nombre — cubre: scroll de 10 en 10, sin datos sensibles — verificación: `ProductReviewIT` (orden, paginación, sin correo)
- [x] `catalog-api.ts` y hooks (`useInfiniteQuery`, `mine`, mutaciones con invalidación) — cubre: actualización de lista, resumen y `rating` — verificación: `reviews-section.test.tsx` y `review-list.test.tsx` (los hooks se prueban a través de los componentes)
- [x] `star-rating-input`, `review-form` y `review-item` — cubre: calificación obligatoria, comentario opcional, límite de 500 con contador, "editado" — verificación: `tests/features/catalogo/components/reviews-section.test.tsx` (formulario: calificación obligatoria, comentario opcional, límite de 500, edición)
- [x] `review-list` con scroll infinito, error con "Reintentar" y descarte de duplicados — cubre: scroll hasta el final, errores de carga, reseñas nuevas durante el scroll — verificación: `tests/features/catalogo/components/review-list.test.tsx` (`IntersectionObserver` simulado)
- [x] `reviews-section` en `product-detail-page.tsx` (visitante, cliente sin compra, con derecho, con reseña propia, sin reseñas, eliminar con `Dialog`) — cubre: todos los criterios de pantalla — verificación: `tests/features/catalogo/components/reviews-section.test.tsx`
- [x] Filtros (Positivas, Neutras, Negativas) en la lista y estrellas fraccionadas bajo el nombre del plato — cubre: filtros, calificación del detalle — verificación: `ProductReviewIT`, `reviews-section.test.tsx`, `fractional-stars.test.tsx`
- [x] Docs: `diagrama-de-base-de-datos.md`, `diagrama-de-casos-de-uso.md` (y su imagen), `cronograma.md` y `catalogo/README.md` — cubre: Impacto en docs — verificación: revisión
- [x] Verificación final: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run`, `pnpm build` y prueba en navegador (visitante, cliente sin compra, cliente con pedido entregado, crear/editar/eliminar, scroll con más de 10 reseñas) — cubre: todos — verificación: comandos y revisión de cada criterio de la spec

### Orden de commits (AGENTS.md)

1. `docs(specs): add spec, plan and tasks for HU-41` (incluye `docs/` actualizado).
2. `feat(backend): add product reviews for delivered purchases (HU-41)`.
3. `feat(frontend): add product reviews to the dish detail (HU-41)`.
