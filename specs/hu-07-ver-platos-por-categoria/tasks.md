# Tareas: HU-07 — Ver los platos organizados por categorías

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Backend: base de datos y configuración

- [x] Crear `V2__catalog.sql` con `categories`, `products`, `product_images`, sus índices y la semilla de las cinco categorías con su `slug` — cubre: modelo de datos, rating 0.0–5.0, unicidad de nombre sin distinguir mayúsculas — verificación: `CatalogSchemaIT` (Testcontainers) — la migración corre; insertar `rating = 5.1` o un nombre de categoría repetido en otra capitalización falla; borrar un plato borra sus imágenes; existen las cinco categorías con sus slugs.
- [x] Agregar `app.minio.public-url` y `app.catalog.page-size` a `application.yml`, y `MINIO_PUBLIC_URL` a `.env.example` — cubre: URLs de imagen, tamaño de página — verificación: usadas por `ImageUrlResolver` y `CatalogService` (ver sus tests).
- [x] Crear la migración repetible de dev `db/dev/R__sample_products.sql` (~45 platos, más de 20 en una categoría, algunos inactivos y uno sin imágenes) y agregar `classpath:db/dev` a `spring.flyway.locations` en `application-dev.yml` — cubre: poder ver la paginación y los casos borde en local — verificación: arrancar con perfil `dev`, correrla dos veces no duplica filas; con perfil por defecto no se carga.

## Backend: dominio

- [x] Crear las entidades `Category`, `Product`, `ProductImage` y los repositorios `CategoryRepository`, `ProductRepository` — cubre: modelo de datos — verificación: `ProductRepositoryIT` — `findByActiveTrueAndCategorySlug` excluye inactivos, filtra por categoría, pagina de a 20 y ordena por nombre; `ddl-auto: validate` arranca sin errores.
- [x] Crear `ImageUrlResolver` — cubre: URL de imagen armada en backend — verificación: `ImageUrlResolverTest` — une base, bucket y `path` sin dobles barras aunque la base termine en `/`.
- [x] Implementar `CatalogService.listCategories()` y `listProducts(slug, page)` con normalización de página — cubre: paginación de 20 en 20, página fuera de rango, plato sin imágenes, plato sin calificación, categoría vacía o inexistente — verificación: `CatalogServiceTest` — `page = 0` y negativa devuelven la 1; `page` mayor al total devuelve la última; categoría inexistente devuelve items vacíos y `totalItems = 0`; el plato sin imágenes tiene `imageUrl = null`; la imagen principal es la de menor `position`.

## Backend: endpoints

- [x] Crear `CatalogController` y los DTOs: `GET /api/categories` y `GET /api/products?category=&page=` — cubre: todos los criterios de backend, acceso sin sesión — verificación: `CatalogControllerIT` — sin cookies devuelve `200`; las categorías vienen en orden de `id` con `slug`; `products` devuelve `items`, `page`, `pageSize`, `totalItems`, `totalPages` correctos para 40 platos (página 1 de 2 y página 2 de 2); un plato inactivo no aparece ni cuenta en el total; sin `category` responde `400`; `page=99` responde la última página.

## Orden de platos (ajuste posterior a la revisión visual)

- [x] Backend: enum `ProductSort`, parámetro `sort` en `GET /api/products` y `CatalogService.listProducts(slug, page, sort)` — cubre: orden aplicado a toda la categoría, rating con `null` al final, valor desconocido — verificación: `ProductSortTest` (mapeo, defecto, desempate) y `CatalogControllerIT` (precio asc/desc, rating desc con nulos al final, nombre desc, `sort=xyz` usa nombre asc, el orden vale para las dos páginas).
- [x] Frontend: `SortSelect` en `CatalogPage` con `sort` en la URL y en la consulta; cambiar el orden vuelve a la página 1 y paginar conserva el orden — cubre: criterios de orden — verificación: `sort-select.test.tsx` y `catalog-page.test.tsx`.

## Frontend: cliente y datos

- [x] Crear `catalog-api.ts` (`getCategories`, `getProducts`) y `use-catalog-queries.ts` (`useCategories`, `useProducts` con `keepPreviousData`) — cubre: obtención de categorías y platos — verificación: usados por `CatalogPage` y sus tests.

## Frontend: componentes

- [x] Crear `src/components/card.tsx` a partir de `design-system/components/Card/README.md` — cubre: aspecto de tarjeta del design system — verificación: `tests/components/card.test.tsx` — renderiza hijos; revisión visual contra `preview.html`.
- [x] Crear `src/components/pagination.tsx` — cubre: cambio de página — verificación: `tests/components/pagination.test.tsx` — no se muestra con 1 página; marca la página actual con `aria-current`; Anterior deshabilitado en la primera y Siguiente en la última; dispara `onPageChange` con el número elegido.
- [x] Crear `features/catalogo/components/category-list.tsx` — cubre: categoría activa resaltada, cambio de categoría — verificación: `tests/features/catalogo/components/category-list.test.tsx` — cada categoría es un enlace a `/{slug}`; solo la del slug actual tiene `aria-current`; con un slug desconocido ninguna lo tiene.
- [x] Crear `features/catalogo/components/product-card.tsx` y la imagen de reemplazo en `public/` — cubre: imagen, nombre, precio `S/ 32.00`, calificación, imagen de reemplazo — verificación: `tests/features/catalogo/components/product-card.test.tsx` — muestra el precio con dos decimales; sin `rating` no muestra calificación; con `imageUrl = null` o tras `onError` usa la imagen de reemplazo.
- [x] Crear `features/catalogo/components/product-grid.tsx` (grilla, esqueletos y mensaje vacío) — cubre: "No se encontraron productos" — verificación: `tests/features/catalogo/components/product-grid.test.tsx` — con `items` vacío muestra el mensaje; con items muestra una tarjeta por plato.

## Frontend: pantalla y rutas

- [x] Crear `CatalogPage` (`/:category`) con lista de categorías a la izquierda, encabezado "Mostrando X-Y de N elementos", grilla y paginación; la página sale de `?page=` normalizada — cubre: layout, paginación, página en la URL, cambio de categoría, categoría inexistente — verificación: `tests/features/catalogo/catalog-page.test.tsx` con API simulada — "Mostrando 1-20 de 40 elementos" en la página 1 y "Mostrando 21-40 de 40 elementos" en `?page=2`; clic en otra categoría navega a `/{slug}` y vuelve a la página 1; `?page=abc` carga la página 1; categoría desconocida muestra "No se encontraron productos" sin resaltar ninguna.
- [x] Crear `HomeRedirect` en `/` que redirige a la primera categoría conservando `location.state` — cubre: `/` lleva a la primera categoría — verificación: `tests/features/catalogo/home-redirect.test.tsx` — navega con `replace` a `/entradas` (primer slug devuelto) y conserva el estado.
- [x] Mover el aviso "Cerraste sesión" de `app.tsx` a `Layout` (`logout-notice.tsx`), eliminar `app.tsx` y `tests/app.test.tsx`, y reorganizar `router.tsx` (`/` → `HomeRedirect`, `/:category` → `CatalogPage`, ambos hijos de `Layout`) — cubre: el aviso de HU-05 sigue funcionando tras la redirección — verificación: `tests/components/layout.test.tsx` — con `state: { loggedOut: true }` se muestra el aviso y se limpia el estado; sin él no se muestra. Las pruebas de `header.test.tsx` y de auth siguen pasando.
- [x] Actualizar `features/catalogo/README.md` con la estructura de la feature — cubre: documentación — verificación: revisión.

## Documentación

- [x] Actualizar `docs/diagrama-de-base-de-datos.md` con `categories`, `products` y `product_images` y sus relaciones — cubre: regla de AGENTS.md sobre cambios al modelo de datos — verificación: revisión; avisar que `images/database-diagram.png` debe regenerarse.

## Verificación cruzada

- [x] Prueba manual real por HTTP (Postgres/Redis reales, perfil `dev`): `GET /api/categories` devuelve las 5 con slug; `GET /api/products?category=ceviches` devuelve 20 de N con `totalPages` correcto; `page=2` devuelve el resto; `category=pizzas` devuelve `200` vacío; un plato inactivo no aparece — cubre: criterios de backend.
- [x] Prueba en navegador (`./scripts/dev.sh`): `/` lleva a `/entradas`; la lista de la izquierda resalta la categoría actual y cambia la URL al elegir otra; en la categoría de más de 20 platos se ve "Mostrando 1-20 de N elementos" y la paginación lleva a la página 2 (recargar la mantiene); `/pizzas` muestra "No se encontraron productos"; `/registro` sigue mostrando el registro; sin sesión se ve igual; tras cerrar sesión aparece el aviso en la categoría; las imágenes de reemplazo se ven (MinIO no está en dev) — cubre: criterios de frontend.
- [x] Antes de commitear: `./mvnw test`, `./mvnw test -Dtest='*IT'`, `pnpm test --run` y `pnpm build`.
- [x] Recorrer cada criterio de aceptación de `spec.md` contra la implementación final y marcar la spec como **Hecha**.
