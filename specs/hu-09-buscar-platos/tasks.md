# Tareas: HU-09 — Buscar platos por nombre

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend

- [x] Crear `V4__product_search.sql` con `CREATE EXTENSION IF NOT EXISTS unaccent` y agregar la nota en `docs/diagrama-de-base-de-datos.md` — cubre: sin distinguir tildes — verificación: `CatalogSchemaIT` — la migración corre y `SELECT unaccent('ceviché')` devuelve `ceviche`.
- [x] Crear `NamePattern.from` — cubre: sin distinguir mayúsculas ni tildes, espacios, término largo, caracteres especiales — verificación: `NamePatternTest` — `null` y `"   "` dan `null`; `"  CEVICHÉ "` da `%ceviche%`; `"50%_!"` queda escapado (`%50!%!_!!%`); un término de 150 caracteres se recorta a 100.
- [x] Crear `ProductSpecifications` y hacer que `ProductRepository` extienda `JpaSpecificationExecutor` — cubre: coincidencia parcial, activos únicamente — verificación: se ejerce en `CatalogControllerIT` (tarea de endpoints).
- [x] Agregar `CategoryRepository.findAllWithActiveMatch` y `CatalogService.listCategories(q)` — cubre: solo categorías con coincidencias, "Todos" sin filtro — verificación: `CatalogServiceTest` — sin término se devuelven todas las categorías; con término se delega en la consulta filtrada con el patrón normalizado.
- [x] Extender `CatalogService.listProducts` y `GET /api/products` con `q` y `category` opcional — cubre: vista "Todos", búsqueda parcial, inactivos fuera, agotados dentro, orden y paginación sobre todo el conjunto, página fuera de rango — verificación: `CatalogControllerIT` — sin `category` devuelve los platos activos de todas las categorías; `q=ceviche`, `q=CEVICHÉ` y `q=  ceviche ` devuelven lo mismo; `q=mixto` encuentra "Ceviche mixto" y "Chicharrón mixto"; un plato inactivo no aparece ni cuenta; uno agotado sí; `q=%` no devuelve todo el catálogo; `q` + `category` filtra por ambos; el orden `price_desc` se aplica entre categorías; `page=99` devuelve la última página.
- [x] Agregar `q` a `GET /api/categories` — cubre: lista de categorías filtrada, sin coincidencias — verificación: `CatalogControllerIT` — con `q` solo vuelven las categorías con platos activos que coinciden, en orden de `id`; un término sin coincidencias devuelve `[]`; sin `q` devuelve todas; ambos endpoints responden `200` sin sesión.
- [x] Mantener `docs/diagrama-de-arquitectura.md` sin cambios y confirmar que `./mvnw test` y `./mvnw test -Dtest='*IT'` pasan — cubre: sin regresiones en HU-07/08/10.

## Frontend

- [x] Actualizar `catalog-api.ts` y `use-catalog-queries.ts` (`q` y `category` opcional, nuevas llaves de caché) — cubre: vista "Todos", búsqueda — verificación: `tests/features/catalogo/catalog-page.test.tsx` — `getProducts` se llama sin `category` en `/` y con `q` cuando la URL lo trae.
- [x] Agregar "Todos" y la conservación de `?q=` en `CategoryList` — cubre: "Todos" resaltado por defecto, elegir categoría conserva el término, categoría desconocida sin resaltado — verificación: `tests/features/catalogo/components/category-list.test.tsx` — "Todos" apunta a `/` y está activo sin `activeSlug`; con `searchTerm` los enlaces son `/?q=...` y `/ceviches?q=...`; con `activeSlug="pizzas"` nada tiene `aria-current`.
- [x] Adaptar `CatalogPage` a `category` opcional y `q`, conservándolo al paginar y ordenar — cubre: resultados en "Todos", cambio de página y de orden conservan el término, mensaje sin resultados, enlace compartido — verificación: `tests/features/catalogo/catalog-page.test.tsx` — `/` muestra "Todos" activo; `/?q=ceviche` pide productos y categorías con `q`; ir a la página 2 mantiene `q` en la URL; sin resultados muestra "No se encontraron productos" y solo "Todos".
- [x] Crear `SearchBox` — cubre: solo busca con lupa o Enter, campo vacío quita el filtro, el campo muestra el término — verificación: `tests/components/search-box.test.tsx` — escribir no navega; clic en la lupa y Enter navegan a `/?q=...`; el término se recorta; enviar vacío navega a `/`; arranca con `initialValue`.
- [x] Montar `SearchBox` en el centro de `Header` (grid de tres zonas) con `key={q}` — cubre: ubicación en el header, buscar desde el detalle, el campo refleja el `q` de la URL — verificación: `tests/components/header.test.tsx` — el buscador aparece con y sin sesión y mientras se confirma; buscar desde `/products/5` navega a `/?q=...`; al abrir `/?q=ceviche` el campo muestra "ceviche".
- [x] Reemplazar la ruta `/` por `CatalogPage` y eliminar `HomeRedirect` con su test — cubre: `/` sin redirección, aviso "Cerraste sesión" sigue visible — verificación: `tests/features/catalogo/catalog-page.test.tsx` — `/` con `state: { loggedOut: true }` muestra la pantalla "Todos" sin cambiar de ruta; las pruebas de `logout-notice` siguen pasando.

## Specs y documentación

- [x] Actualizar `specs/hu-07-ver-platos-por-categoria/spec.md` — cubre: impacto en HU-07 — `/` ya no redirige, opción "Todos", `category` opcional en `GET /api/products`, y marcar como cumplida la nota sobre HU-09.
- [x] Pasar `spec.md` a **En implementación** al empezar y a **Hecha** al cerrar.

## Verificación en navegador y cierre

- [x] Recorrer en navegador: abrir `/` (todos los platos, "Todos" resaltado); escribir sin enviar (no cambia nada); buscar con Enter y con la lupa; buscar con mayúsculas y tildes; elegir una categoría del filtro y ver el slug con `?q=` en la URL; paginar y ordenar; vaciar el campo y presionar Enter; buscar algo inexistente; recargar y compartir el enlace; buscar desde el detalle de un plato — cubre: criterios de pantalla y URL.
- [x] Repasar cada criterio de `spec.md`, correr `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
