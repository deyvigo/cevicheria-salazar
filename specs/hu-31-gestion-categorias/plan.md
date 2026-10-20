# Plan: HU-31 — Gestionar las categorías del catálogo

`spec.md` en estado Clarificada.

## Backend

### Endpoints (paquete `admin`)

Todos bajo `/api/admin/categories`, protegidos por el `AdminAccessInterceptor` existente (`/api/admin/**`): sin sesión `401`, Cliente `403`. La lectura pública `GET /api/categories` de `catalogo` no cambia.

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /api/admin/categories?q=&page=1` | — | `200` con `PageResponse<AdminCategoryResponse>` (20 por página, por nombre ascendente; `q` opcional filtra por nombre o `slug`) |
| `POST /api/admin/categories` | `{ name, slug }` | `201` con `AdminCategoryResponse` |
| `PUT /api/admin/categories/{id}` | igual que `POST` | `200` con `AdminCategoryResponse` |
| `DELETE /api/admin/categories/{id}` | — | `204` |

`AdminCategoryResponse`: `{ id, name, slug, productCount }`. `PageResponse` es el record que ya usa `catalogo/dto`.

**Validación (`CategoryRequest`)**: `name` `@NotBlank` `@Size(max = 80)`; `slug` `@NotBlank` `@Size(max = 80)` y `@Pattern("^[a-z0-9]+(-[a-z0-9]+)*$")` (sin guion al inicio/final ni consecutivos). El constructor compacto aplica `strip()` a ambos y `toLowerCase(Locale.ROOT)` al `slug` antes de validar, como `UpdateProfileRequest`. `q` se recorta (`strip`), se limita a 100 caracteres y, si queda vacío, se ignora. La búsqueda compara `lower(name)` y `lower(slug)` con `like '%q%'` (sin `unaccent`: solo ignora mayúsculas), escapando `!`, `%` y `_` para que sean texto literal. Un `page` menor que 1 se trata como 1; uno mayor que la última devuelve la última página.

**Reglas**
- Nombre repetido (sin distinguir mayúsculas) o `slug` repetido → `409` con `FieldConflictException("name", "Ya existe una categoría con ese nombre.")` / `("slug", "Ya existe una categoría con ese enlace.")`, que `ApiExceptionHandler` ya traduce a un error por campo. En `PUT` se excluye la propia fila (`...AndIdNot`). Si ambos chocan se informa el nombre.
- Dos peticiones simultáneas pueden pasar la comprobación previa: el `saveAndFlush` captura `DataIntegrityViolationException` y la traduce al mismo `409` según la restricción violada (`uq_categories_name_lower` o `categories_slug_key`).
- `PUT` sin cambios efectivos responde `200` igual (idempotente).
- `DELETE`: `404` si no existe (`CategoryNotFoundException`); `409` (`CategoryInUseException`, "No se puede eliminar: tiene platos asociados.") si `productRepository.existsByCategoryId(id)`, contando activos e inactivos. La clave foránea `products.category_id` sigue siendo la red de seguridad: si una carrera deja pasar el borrado, el `DataIntegrityViolationException` al hacer `flush` se traduce al mismo `409`.

### Capas

- **`catalogo/Category`**: se agrega `update(String name, String slug)`; la entidad deja de ser inmutable.
- **`catalogo/CategoryRepository`**: `existsByNameIgnoreCase`, `existsByNameIgnoreCaseAndIdNot`, `existsBySlug`, `existsBySlugAndIdNot` `findAllWithProductCount(Pageable)` y `searchWithProductCount(pattern, Pageable)` (dos consultas separadas, porque un parámetro `null` opcional da problemas de tipo en PostgreSQL), paginadas y con proyección `AdminCategoryResponse` (`select new ... (c.id, c.name, c.slug, (select count(p) from Product p where p.category = c)) from Category c order by lower(c.name), c.id`) y `countQuery` sobre `Category`. `existsByNameIgnoreCase` equivale al índice único `lower(name)`.
- **`catalogo/ProductRepository`**: `existsByCategoryId(Long)` y `countByCategoryId(Long)` (esta última para el `productCount` de la respuesta de `PUT`).
- **`admin/AdminCategoryService`** (`@Transactional`): listar (con búsqueda), crear, editar y eliminar.
- **`admin/AdminCategoryController`**: delgado, delega en el servicio; `dto/CategoryRequest` y `dto/AdminCategoryResponse` en `admin/dto`.
- **`common/exception`**: `CategoryNotFoundException` (`404`, "No encontrado") y `CategoryInUseException` (`409`) con sus handlers en `ApiExceptionHandler`.
- **`SecurityConfig` / `AdminAccessInterceptor`**: sin cambios.

### Base de datos

Sin migración: `categories` ya tiene `name`, `slug` único, el índice único `lower(name)` y la clave foránea desde `products`. Hibernate sigue en `validate`.

## Frontend

### Rutas (`router.tsx`)

`/admin/categorias` deja de renderizar `AdminSectionPage` y pasa a `AdminCategoriesPage`: el `map` sobre `ADMIN_SECTIONS` excluye la ruta `categorias` y se agrega explícita. La página lee `?page=` y `?q=` (`useSearchParams`; `page` inválido o menor que 1 → 1; `q` se recorta).

### Pantallas y componentes (`features/admin/`)

- **`admin-categories-page.tsx`**: título "Categorías" y, debajo, una barra con el buscador (`components/category-search.tsx`) y al lado el botón "Agregar categoría"; la lista usa `useAdminCategories(q, page)`. Estados: carga, error con "Reintentar", vacío total ("Aún no tienes categorías" con botón para agregar, sin buscador), sin resultados ("No se encontraron categorías" con el texto buscado, buscador y botón visibles) y lista. Debajo, `Pagination` (`@/components/pagination`, que ya devuelve `null` con `totalPages <= 1`). Si la respuesta llega con `items` vacíos, `page > 1` y `totalPages >= 1`, reemplaza `?page=` por `totalPages` (cubre eliminar la única categoría de la última página). Administra qué diálogo está abierto (agregar, editar con su categoría, eliminar con su categoría).
- **`components/category-table.tsx`**: tabla (`<table>`) con columnas Nombre, Slug, Platos y Acciones, dentro de un contenedor con `overflow-x-auto` para celulares. "Eliminar" va `disabled` con `productCount > 0`; como un botón deshabilitado no recibe eventos de hover ni foco, va envuelto en un `<span>` enfocable que muestra al pasar el cursor o al enfocar un aviso (`role="tooltip"`, enlazado con `aria-describedby`): "Tiene N platos asociados: muévelos a otra categoría antes de eliminarla". El aviso no es visible de forma permanente.
- **`components/category-dialog.tsx`**: un solo diálogo para agregar y editar (`category` opcional), `react-hook-form` + `zod` (nombre ≤ 80, `slug` ≤ 80 con el mismo patrón que el servidor; `trim`, `slug` en minúsculas). **Solo al crear**, mientras `dirtyFields.slug` sea falso, un `useEffect` sobre el nombre llama a `setValue('slug', slugify(name))`; al editar nunca se propone. Al editar, si el `slug` difiere del guardado, aparece bajo el campo "Los enlaces anteriores dejarán de funcionar". "Guardar" deshabilitado sin cambios al editar o mientras envía. Error del servidor: `fieldErrors` en su campo (nombre o `slug` repetido); si no, "No pudimos guardar la categoría, intenta de nuevo". `reset` al abrir. Éxito: cierra y `Notification` "Categoría agregada" / "Categoría actualizada".
- **`components/delete-category-dialog.tsx`**: confirmación con el nombre; `409` muestra "No se puede eliminar: tiene platos asociados" y refresca la lista; otro error "No pudimos eliminar la categoría, intenta de nuevo"; éxito cierra y notifica "Categoría eliminada".
- **`components/category-search.tsx`**: `<form role="search">` con `input type="search"` (`maxLength` 100, `aria-label="Buscar categorías"`, placeholder "Buscar categorías") y botón con ícono de lupa (`SearchIcon` compartido), con el mismo aspecto que el `SearchBox` de la tienda. Al enviar, escribe `?q=` (o lo quita si está vacío) y elimina `page`. El valor del campo se sincroniza con `?q=` de la URL.
- **`slugify.ts`**: `NFD` + quitar diacríticos, minúsculas, todo lo que no sea `a-z0-9` pasa a `-`, recorta guiones de los extremos y se corta a 80.
- **`admin-category-api.ts`**: `listAdminCategories({ q, page })`, `createCategory`, `updateCategory`, `deleteCategory` con la instancia `api`.
- **`use-admin-categories.ts`** y **`use-admin-category-mutations.ts`**: `useQuery(['admin', 'categories', q, page])` con `placeholderData: keepPreviousData` y tres mutaciones que, al éxito, invalidan `['admin', 'categories']` y `['catalog']` (menú, listados y detalle de la tienda). Sin actualización optimista.
- Design system: `Dialog`, `Card`, `Input`, `Button`, `Notification`; sin tokens nuevos. Íconos de las acciones: los compartidos de `src/components`.

## Seguridad

- La autorización vive en el servidor (`AdminAccessInterceptor` consulta el rol y `is_active` en la base de datos); el guard de `/admin` del frontend es solo UX.
- Validación y unicidad en el servidor aunque el frontend ya valide; el texto se muestra como texto de React, sin HTML. El `slug` validado con patrón estricto es seguro en URLs.
- La restricción de borrado no depende de la pantalla: la comprueba el servicio y la respalda la clave foránea.

## Decisiones

- **Paquete `admin`**: la entidad y el repositorio siguen en `catalogo`; los endpoints y el servicio de gestión van en `admin`, con el prefijo `/api/admin/**` que ya protege el interceptor. HU-29 y siguientes seguirán el mismo patrón.
- **Sin migración**: no cambia el esquema, solo la regla de negocio sobre el `slug`.
- **Sin slugs reservados**: la tienda sirve las categorías en `/menu/{slug}`, así que no hay choque posible con rutas fijas (por eso se retiró de la spec el criterio del "enlace no disponible").
- **Sin caché que invalidar**: el catálogo hoy no usa Redis para las categorías; la tienda las conserva 5 minutos en React Query (`staleTime`), y las mutaciones del panel invalidan `['catalog']` solo en el navegador del administrador.
- **Orden de la tienda sin cambios**: `GET /api/categories` sigue ordenando por `id` (las nuevas aparecen al final); el orden por nombre es solo del panel.
- **Conteo de platos con subconsulta** en la consulta paginada: una sola consulta por página, sin N+1.
- **Un diálogo para agregar y editar**, y sin `PATCH`: se envían siempre ambos campos, igual que HU-24.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: en `categories`, `slug` ya no es estable: cambia la nota de "no cambia aunque se renombre" a que el administrador puede editarlo (HU-31) y que el `slug` que tenía antes deja de resolver. La imagen no cambia (no hay columnas ni relaciones nuevas).
- `specs/hu-07-ver-platos-por-categoria/spec.md`: actualizar la regla de `slug` estable (tabla de la clase Categoría y casos borde) con una referencia a esta historia, en el mismo cambio.
- `docs/cronograma.md`: marcar HU-31 como hecha al cerrar.
- Casos de uso y arquitectura: sin cambios ("Gestionar categorías" ya está en el diagrama).
