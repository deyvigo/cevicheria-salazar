# Plan: HU-29 — Crear, editar y eliminar platos

`spec.md` en estado Clarificada.

## Backend

### Base de datos

Migración `V7__product_soft_delete.sql`:
- `ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ;` más un índice parcial `idx_products_not_deleted` sobre `(category_id, is_active, name) WHERE deleted_at IS NULL` si las consultas lo justifican.
- `category_id` no cambia: sigue `NOT NULL` con su clave foránea.
- `Product` se ajusta para que Hibernate en `validate` coincida. `product_images` no cambia (siguen asociadas al plato eliminado).

### Endpoints (paquete `admin`)

Bajo `/api/admin/products`, protegidos por el `AdminAccessInterceptor` (`/api/admin/**`): sin sesión `401`, Cliente `403`.

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /api/admin/products?q=&sort=&dir=&page=1` | — | `200` con `PageResponse<AdminProductResponse>` (15 por página; `q` opcional; `sort` = `name` (defecto), `category`, `price`, `rating` o `stock`; `dir` = `asc` (defecto) o `desc`; valores desconocidos caen en el defecto) |
| `GET /api/admin/products/{id}` | — | `200` con `AdminProductResponse` (404 si no existe o está eliminado) |
| `POST /api/admin/products` | `multipart/form-data` | `201` con `AdminProductResponse` |
| `PUT /api/admin/products/{id}` | `multipart/form-data` | `200` con `AdminProductResponse` |
| `DELETE /api/admin/products/{id}` | — | `204` |

`AdminProductResponse`: `{ id, name, description, price, categoryId, categoryName, stock, active, available, images: [{ id, url }] }` (`images` ordenadas por `position`; `url` la arma `ImageUrlResolver`).

**Cuerpo multipart** (`POST`/`PUT`): parte `data` (JSON `ProductRequest`) y partes `files` (0..n archivos). `ProductRequest`: `name`, `description`, `price`, `categoryId`, `stock`, `active`, `available` y `images`, la lista final y ordenada de entradas `{ "id": 12 }` (imagen existente que se conserva) o `{ "file": 0 }` (índice dentro de `files`). Así un único guardado expresa reordenar, quitar y agregar.

**Validación**: `name` `@NotBlank` `@Size(max = 150)`; `description` `@NotBlank` `@Size(max = 1000)`; `price` `@NotNull` `@DecimalMin("0")` `@DecimalMax("9999.99")` `@Digits(integer = 4, fraction = 2)`; `categoryId` `@NotNull` y debe existir (si no, `400` con el campo); `stock` `@Min(0)` `@Max(9999)`; `images` de 1 a 5 entradas. El constructor compacto aplica `strip()` a nombre y descripción. Cada entrada `{ id }` debe pertenecer al plato (si no, `400`); cada `{ file }` debe apuntar a un archivo existente y todo archivo recibido debe estar referenciado. Archivos: máximo 5 MB, tipo detectado por los primeros bytes (JPEG, PNG o WebP), no por `Content-Type` ni extensión; si no, `400` con campo `images`. Se fijan `spring.servlet.multipart.max-file-size=5MB` y `max-request-size=26MB`.

**Orden**: `AdminProductSort` traduce `sort`/`dir` a un `Sort` de Spring Data (nombre y categoría sin distinguir mayúsculas; `rating` con `nullsLast` en ambas direcciones, como la tienda) y siempre agrega nombre e `id` como desempate. La lectura usa `ProductRepository.findAll(Specification, Pageable)` con `ProductSpecifications` (no eliminados, categoría cargada en la misma consulta, y coincidencia de nombre), en lugar de consultas `@Query` por separado.

**Reglas**
- `PUT` aplica los campos, recalcula `position` según el orden recibido (0, 1, 2...), crea las `ProductImage` nuevas y elimina de la colección las no listadas (`orphanRemoval`). `PUT` sin cambios efectivos responde `200`.
- `DELETE`: `404` si no existe o ya estaba eliminado; si no, `product.softDelete()` fija `deletedAt`. No se borran objetos ni imágenes.

### Almacenamiento de imágenes

- **`catalogo/ImageStorage`** (nuevo, sobre el `S3Client` de HT-10): `String upload(byte[] / InputStream, contentType)` que genera la clave `platos/{uuid}.{ext}` y devuelve el `path`, y `void delete(String path)`. Las integraciones externas viven solo en servicios, no en controladores.
- **Orden de operaciones en el servicio** (`@Transactional`): (1) validar todo; (2) subir los archivos nuevos; (3) si algo falla después, borrar lo ya subido (compensación) y relanzar; (4) persistir; (5) con `TransactionSynchronization.afterCommit`, borrar del almacenamiento las imágenes quitadas, ignorando errores (se registran en el log).

### Cambios en la lectura pública (soft delete)

Todas las consultas de `catalogo` que leen platos excluyen `deleted_at IS NOT NULL`: listado por categoría, búsqueda (HU-09), destacados (HU-11), detalle y lectura por ids para el carrito. **Excepción**: `existsByCategoryId`/`countByCategoryId` (conteo y bloqueo de eliminación de categorías, HU-31) cuentan también los eliminados. Se centraliza en un único punto (`ProductSpecifications` y los métodos derivados `...AndDeletedAtIsNull`) y se cubre con pruebas por cada endpoint, para que ninguna consulta nueva lo olvide. No se usa `@SQLRestriction` en `Product`, porque también filtraría el conteo de categorías, que debe incluir los eliminados.

### Capas

- **`catalogo/Product`**: `update(...)`, `softDelete()`, `deletedAt`; `replaceImages(...)`.
- **`catalogo/ProductRepository`**: búsqueda paginada del panel con `unaccent(lower(name)) like` (mismo patrón de escape que `NamePattern`), ordenada por `lower(name), id`.
- **`admin/AdminProductService`**, **`admin/AdminProductController`** y `admin/dto/{ProductRequest, AdminProductResponse}`; `ImageStorage` en `catalogo`.
- **`common/exception`**: `ProductNotFoundException` ya existe; se agrega `FieldInvalidException` para imágenes/categoría si no cubre el caso.

## Frontend

### Rutas

`/admin/platos` deja de renderizar `AdminSectionPage` y pasa a `AdminProductsPage` (igual que `categorias`). Lee `?page=`, `?q=`, `?sort=` y `?dir=`; los valores por defecto (Nombre ascendente) no se escriben en la URL.

### Pantallas y componentes (`features/admin/`)

- **`admin-products-page.tsx`**: título "Platos", barra con `product-search.tsx` y "Agregar plato"; mismos estados que `admin-categories-page.tsx` (carga, error con "Reintentar", vacío total, sin resultados, lista) y `Pagination`. Administra el diálogo abierto (agregar, editar con su plato, eliminar con su plato).
- **`components/product-table.tsx`**: tabla con las columnas de la spec, `overflow-x-auto`; **Activo** y **Disponible** como texto "Sí"/"No" con badge (el significado nunca depende solo del color).
- **`components/product-dialog.tsx`**: diálogo único para agregar y editar con `react-hook-form` + `zod` (límites idénticos al servidor), selector de categoría (reutiliza `useAdminCategories` o `GET /api/categories`) e interruptores Activo/Disponible. "Guardar" deshabilitado sin cambios al editar (incluyendo cambios de imágenes) o enviando. Éxito: cierra y `Notification` "Plato agregado" / "Plato actualizado". Al editar carga el detalle con `GET /api/admin/products/{id}`.
- **`components/product-images-field.tsx`**: campo controlado con la lista ordenada de `{ id?, url, file? }`. Previews con `URL.createObjectURL` (se liberan al quitar o desmontar); validación local de tipo/tamaño/máximo; reordenamiento arrastrando (API nativa de HTML5, sin dependencias nuevas) y con Alt + flechas sobre la miniatura enfocada; la "x" para quitar aparece arriba a la derecha al pasar el cursor o enfocar (siempre visible en pantallas táctiles). La primera lleva la etiqueta "Principal".
- **`components/delete-product-dialog.tsx`**: confirmación con el nombre; éxito cierra y notifica "Plato eliminado"; 404 refresca la lista.
- **`admin-product-api.ts`**: `listAdminProducts`, `getAdminProduct`, `createProduct`, `updateProduct`, `deleteProduct`; `FormData` con `data` como `Blob` JSON y los `files` nuevos (no se fija `Content-Type`, el navegador agrega el `boundary`).
- **`use-admin-products.ts`** y **`use-admin-product-mutations.ts`**: `useQuery(['admin', 'products', q, page])` con `keepPreviousData`; las mutaciones invalidan `['admin', 'products']`, `['admin', 'categories']` (cambia `productCount`) y `['catalog']`.
- Design system: `Dialog`, `Card`, `Input`, `Button`, `Notification` y el `Switch` compartido (ver HU-30); sin tokens nuevos.

## Seguridad

- Autorización en el servidor (`AdminAccessInterceptor`); el guard del frontend es solo UX.
- Tipo de archivo verificado por contenido; nombre de objeto generado por el servidor (sin usar el nombre del cliente, sin rutas); tamaño limitado antes de leer a memoria.
- Todo texto se muestra como texto de React, sin HTML.

## Decisiones

- **Un solo `multipart` por guardado** en lugar de endpoints de imágenes sueltas: el guardado es atómico respecto a las imágenes y "Cancelar" no deja efectos en el almacenamiento.
- **Compensación y `afterCommit`** en vez de transacciones distribuidas: nunca queda un plato apuntando a una imagen que no existe; lo peor es un objeto huérfano invisible.
- **Soft delete con `deleted_at`**, coherente con `addresses` (HU-24), y no con `is_active`, porque inactivo es un estado editable y visible en el panel y eliminado no.
- **Mismo patrón que HU-31** para tabla, búsqueda, paginación y diálogos, para reutilizar `Pagination`, `SearchIcon` y la forma de las pruebas.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: `products.deleted_at` (borrado lógico; las consultas filtran `deleted_at IS NULL`), la nota de que `stock`/`is_available` también se editan en HU-29; regenerar `docs/images/database-diagram.png` queda a cargo de la persona responsable, como en historias anteriores.
- `docs/diagrama-de-arquitectura.md`: el servicio de catálogo/administración sube y borra imágenes en Garage (HU-29); la nota de Garage ya lo menciona, se confirma.
- `specs/hu-31-gestion-categorias/spec.md`: aclarar en sus casos borde que los platos eliminados lógicamente siguen contando y bloqueando la eliminación de la categoría.
- `docs/cronograma.md`: marcar HU-29 como hecha al cerrar.
