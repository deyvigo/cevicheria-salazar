# Plan: HU-09 — Buscar platos por nombre

`spec.md` en estado Clarificada.

## Backend

### Base de datos

Migración `V4__product_search.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
```

- La búsqueda no distingue tildes (`ceviché` = `ceviche`, `piña` = `pina`); `unaccent` es la forma estándar de PostgreSQL de hacerlo. Es una extensión `trusted` desde PostgreSQL 13 y viene en la imagen `postgres:16` (contrib), así que la migración la crea el usuario de Flyway sin ser superusuario.
- Sin índice nuevo. Un `LIKE '%término%'` con `unaccent` no usa el índice `idx_products_category_active_name`, pero el catálogo es de decenas de platos y un recorrido secuencial es inmediato. Si el catálogo creciera, el siguiente paso es un índice `pg_trgm` sobre `unaccent(lower(name))`; no se hace ahora.
- Actualizar `docs/diagrama-de-base-de-datos.md` con una nota: la búsqueda por nombre usa la extensión `unaccent`; no hay tablas ni columnas nuevas.

### Capas (paquete `com.salazar.api.catalogo`)

- **`NamePattern`** (nuevo, clase de utilidad): `static String from(String raw)` devuelve el patrón `LIKE` o `null` si no hay búsqueda.
  1. `null` o en blanco tras `trim()` → `null`.
  2. Recorta a 100 caracteres.
  3. Pasa a minúsculas (`Locale.ROOT`) y quita las marcas diacríticas (`Normalizer` NFD + eliminar `\p{M}`).
  4. Escapa `!`, `%` y `_` con `!` para que sean texto literal. El escape es `!` y no `\` porque un literal HQL no admite una barra invertida sola (`escape '\'` no parsea).
  5. Devuelve `%término%`.
- **`ProductSpecifications`** (nuevo): `Specification<Product>` por criterio, para componerlos sin el problema de parámetros `null` tipados de Postgres en un `@Query` con `:param is null`.
  - `active()`: `active = true`.
  - `inCategory(slug)`: `category.slug = :slug`.
  - `nameMatches(pattern)`: `function('unaccent', lower(name)) like :pattern escape '!'`.
- **`ProductRepository`**: extiende además `JpaSpecificationExecutor<Product>`. Se conservan `findByActiveTrueAndCategorySlug` y `findByIdAndActiveTrue` mientras sigan en uso (el detalle usa el segundo; el primero se elimina si el listado deja de usarlo).
- **`CategoryRepository`**: agrega `findAllWithActiveMatch(String pattern)`, un `@Query` JPQL: categorías (orden por `id`) con al menos un plato `active = true` cuyo nombre cumple el mismo `like` que `nameMatches`; HQL tipa `function('unaccent', ...)` como `Object`, por lo que va envuelto en `cast(... as String)`.
- **`CatalogService`**:
  - `listCategories(String q)`: sin término, igual que hoy (todas, incluso las sin platos); con término, `findAllWithActiveMatch`.
  - `listProducts(String categorySlug, String q, int page, ProductSort sort)`: compone `active()` + `inCategory` si `categorySlug` no es `null` + `nameMatches` si hay patrón, y pagina con `PageRequest.of(page - 1, pageSize, sort.toSort())`. La corrección de página fuera de rango queda igual.
- **`CatalogController`**:
  - `GET /api/categories?q=` — `q` opcional.
  - `GET /api/products?category=&q=&page=&sort=` — `category` pasa a ser **opcional** (sin ella, todas las categorías) y se suma `q` opcional. Un `category` en blanco se trata como ausente.
- `ProductResponse`, `PageResponse`, seguridad: sin cambios. Los endpoints siguen siendo públicos y de solo lectura.

### Compatibilidad

`category` deja de ser obligatorio: antes, omitirlo daba `400`; ahora devuelve todo el catálogo. El único cliente es el frontend, que se actualiza en el mismo cambio.

## Frontend

### Archivos

- **`src/components/search-box.tsx`** (nuevo): campo de búsqueda del header.
  - `<form role="search">` con un `<input type="search">` (`aria-label="Buscar platos"`, placeholder "Buscar platos", `maxLength={100}`) y un `<button type="submit" aria-label="Buscar">` con una lupa SVG inline (mismo estilo que los íconos de `input.tsx`). El submit del formulario cubre clic en la lupa y Enter; no hay `onChange` que navegue.
  - Prop `initialValue`: el estado del campo arranca ahí. El `Header` lo monta con `key={q}` para que el campo se reinicie cuando cambia el `q` de la URL (navegar a otra búsqueda, quitar el filtro, el botón atrás).
  - Al enviar: `term = value.trim()`; navega a `/?q=<term>` (`URLSearchParams`) o a `/` si está vacío. Nunca conserva categoría, página ni orden.
  - No usa `components/input.tsx`: ese componente trae etiqueta visible y ancho máximo de 340 px, pensados para formularios. Reutiliza sus tokens (`h-12 rounded-md border-border-strong`, `focus:ring-celeste-200`, `placeholder:text-ink-subtle`) para que se vea igual.
- **`src/components/header.tsx`**: pasa de `flex justify-between` a un grid de tres zonas (`grid-cols-[1fr_minmax(0,32rem)_1fr]`): logo a la izquierda, `SearchBox` en el centro, sesión a la derecha (`justify-self-end`). Con grid el buscador queda centrado aunque la zona derecha esté vacía mientras se confirma la sesión. Lee `q` con `useSearchParams` para el `initialValue`.
- **`src/router.tsx`**: `/` y `/:category` renderizan `CatalogPage`; se elimina la ruta con `HomeRedirect`. Las rutas fijas (`/products/:id`, `/registro`, …) conservan prioridad.
- **`src/features/catalogo/home-redirect.tsx`** y su test: se eliminan.
- **`catalog-api.ts`**: `getCategories(q?)` y `getProducts({ category?, q?, page, sort })`; los parámetros `undefined` no se envían.
- **`use-catalog-queries.ts`**: `useCategories(q)` con `queryKey: ['catalog', 'categories', q]` y `placeholderData: keepPreviousData` (la lista no parpadea al buscar); `useProducts(category, q, page, sort)` con la llave `['catalog', 'products', category, q, page, sort]`. El `placeholderData` de `useProduct` sigue buscando por el prefijo `['catalog', 'products']`.
- **`components/category-list.tsx`**: agrega "Todos" como primer ítem (enlace a `/`, activo cuando `activeSlug` es `undefined`) y recibe `searchTerm` para que cada enlace conserve `?q=` (`/{slug}?q=...`, `/?q=...`). Una categoría desconocida en la URL (`/pizzas`) no resalta nada, ni siquiera "Todos".
- **`catalog-page.tsx`**: `category` pasa a ser opcional (`useParams`), lee `q` de `searchParams` (recortado; vacío = sin búsqueda) y lo pasa a `useCategories` y `useProducts`. `updateParams` conserva `q` al cambiar de página u orden. El cambio de categoría es un enlace, así que reinicia página y orden por construcción.

### Componentes del design system

Sin componentes nuevos del `design-system/`; el campo reutiliza los tokens de `Input`. Los textos van en español sin emojis ("Buscar platos", "Todos").

## Seguridad

- El término llega por query string y nunca se concatena en SQL: va como parámetro enlazado; los comodines del usuario se escapan en `NamePattern`.
- Longitud acotada a 100 caracteres en frontend (`maxLength`) y backend (recorte).
- Endpoints públicos y de solo lectura, sin datos sensibles; no hay efecto sobre sesión, cookies ni Redis.

## Decisiones

- **`unaccent` en PostgreSQL y no una columna normalizada**: una columna `name_search` obligaría a HU-29 a mantenerla sincronizada al editar platos; la función no agrega estado.
- **Normalizar el término en Java**: se evita pasar un parámetro dentro de `function('unaccent', ...)`, que Hibernate tipa mal. La diferencia de cobertura entre `Normalizer` y `unaccent` (letras como `ø` o `ß`) no afecta al español.
- **`Specification` en vez de un `@Query` con `:param is null`**: Postgres no puede inferir el tipo de un parámetro `null` en ese patrón.
- **Un solo `GET /api/products` con `category` opcional**: la vista "Todos" y la búsqueda son el mismo listado con distintos filtros; un endpoint aparte duplicaría paginación y orden.
- **Filtrado de categorías en el servidor** (`GET /api/categories?q=`): el cliente no puede deducir qué categorías tienen coincidencias de una sola página de resultados.
- **El buscador reinicia categoría, página y orden**: buscar siempre aterriza en "Todos" (decisión de la spec); no hay estado que arrastrar.
- **`/todos` no se bloquea**: sin API de escritura de categorías no hay forma de crear ese `slug`; la validación pertenece a HU-29, que ya debe rechazar slugs que choquen con rutas fijas (ver HU-07).
- **Cambia HU-07**: se actualiza `specs/hu-07-ver-platos-por-categoria/spec.md` (ver "Impacto en HU-07" de esta spec) en el mismo cambio.
