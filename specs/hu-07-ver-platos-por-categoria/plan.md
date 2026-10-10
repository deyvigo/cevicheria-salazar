# Plan: HU-07 — Ver los platos organizados por categorías

`spec.md` en estado Clarificada.

## Backend

### Endpoints (paquete `catalogo`, ambos públicos y de solo lectura)

- **`GET /api/categories`**: devuelve todas las categorías ordenadas por `id`.
  ```json
  [{ "id": 1, "name": "Entradas", "slug": "entradas" }, ...]
  ```
- **`GET /api/products?category={slug}&page={n}&sort={criterio}`**: platos activos de una categoría, paginados de 20 en 20.
  - `category` es obligatorio (si falta, `400`). `page` es 1-based y opcional (por defecto `1`); no hay parámetro `size`, el tamaño es fijo (`app.catalog.page-size: 20`).
  - `sort` opcional: `name_asc` (por defecto), `name_desc`, `price_asc`, `price_desc`, `rating_asc` o `rating_desc` (en ambos de rating los `null` van al final). Un valor desconocido se trata como el por defecto. El orden siempre se completa con `name` e `id` como desempate, para que la paginación sea estable.
  - `page < 1` se trata como `1`; `page` mayor al total se trata como la última página (con `totalItems = 0`, `page` es `1`).
  - Categoría inexistente: `200` con la página vacía, igual que una categoría sin platos. El frontend no distingue los dos casos (ver spec).
  ```json
  {
    "items": [
      { "id": 7, "name": "Ceviche clásico", "description": "...", "price": 32.00, "rating": 4.5,
        "imageUrl": "https://media.cevicheria-salazar.com/platos/ceviche-clasico-1.jpg" }
    ],
    "page": 1,
    "pageSize": 20,
    "totalItems": 40,
    "totalPages": 2
  }
  ```
  `imageUrl` es la imagen de menor `position`, o `null` si el plato no tiene imágenes. `rating` es `null` si no tiene calificación.

### Capas (paquete `com.salazar.api.catalogo`)

- **Entidades**: `Category` (`id`, `name`, `slug`), `Product` (`id`, `name`, `description`, `price`, `category`, `rating`, `images`, `createdAt`, `active`) y `ProductImage` (`id`, `product`, `path`, `position`, `createdAt`). Mismo estilo que `RefreshToken`: `@Getter`, `@NoArgsConstructor(PROTECTED)`, `@PrePersist` para `createdAt`.
  - `Product.category` es `@ManyToOne(fetch = LAZY)`. `Product.images` es `@OneToMany(mappedBy = "product")` con `@OrderBy("position ASC")` y `@BatchSize(size = 20)`, para cargar las imágenes de la página en una sola consulta extra en vez de una por plato.
  - El campo Java es `active`, mapeado a la columna `is_active`.
- **Repositorios**: `CategoryRepository.findAllByOrderByIdAsc()` y `ProductRepository.findByActiveTrueAndCategorySlug(String slug, Pageable pageable)`.
- **`ProductSort`** (enum): mapea el valor de `sort` a un `Sort` de Spring Data (`from(String)` devuelve `NAME_ASC` ante `null` o valor desconocido) y le agrega los desempates.
- **`CatalogService`** (`@Transactional(readOnly = true)`, necesario porque `open-in-view` está en `false` y las imágenes son lazy): `listCategories()` y `listProducts(String categorySlug, int page, ProductSort sort)`, que normaliza `page`, arma el `PageRequest`, y si la página pedida excede `totalPages` repite la consulta con la última.
- **`ImageUrlResolver`**: arma `{app.minio.public-url}/{app.minio.bucket}/{path}`. Es el único lugar que conoce el formato de la URL; ni la BD ni el controlador la tocan.
- **`CatalogController`**: mapea a DTOs (`dto/CategoryResponse`, `dto/ProductResponse`, `dto/PageResponse<T>`, records con `from(...)` como `UserResponse`). Nunca expone entidades.
- **Seguridad**: sin cambios. `SecurityConfig` ya permite todo `GET`; los endpoints no leen la sesión.

### Base de datos

Migración `V2__catalog.sql` (a documentar en `docs/diagrama-de-base-de-datos.md`):

```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE
);
CREATE UNIQUE INDEX uq_categories_name_lower ON categories (lower(name));

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category_id BIGINT NOT NULL REFERENCES categories (id),
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category_active_name ON products (category_id, is_active, name);

CREATE TABLE product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_product_id ON product_images (product_id, position);
```

- La misma migración inserta las cinco categorías con su `slug`.
- **Datos de ejemplo**: migración repetible `db/dev/R__sample_products.sql`, solo cargada en el perfil `dev` (`spring.flyway.locations: classpath:db/migration,classpath:db/dev` en `application-dev.yml`), idempotente (`INSERT ... WHERE NOT EXISTS`). Crea unos 45 platos repartidos entre categorías (más de 20 en una, para poder ver la paginación) con `path` de imagen. No llegan a producción.
- **Configuración**: nueva propiedad `app.minio.public-url` (`${MINIO_PUBLIC_URL:http://localhost:9000}`) junto a las de MinIO en `application.yml`, y `app.catalog.page-size: 20`. Agregar `MINIO_PUBLIC_URL` a `.env.example`.

## Frontend

### Pantallas y rutas

- **`/`** → `HomeRedirect` (`features/catalogo/home-redirect.tsx`): pide las categorías y navega con `replace` a `/{primera.slug}` conservando `location.state` (para no perder el aviso "Cerraste sesión"). Mientras carga no muestra nada.
- **`/:category`** → `CatalogPage` (`features/catalogo/catalog-page.tsx`), hija de `Layout`, así que hereda el header. Las rutas fijas (`/registro`, `/iniciar-sesion`, ...) tienen prioridad por especificidad en React Router. El número de página sale de `?page=` (se normaliza a entero ≥ 1 antes de llamar a la API).
- **Aviso "Cerraste sesión"**: hoy vive en `app.tsx`, que deja de ser la página de inicio. Se mueve a `Layout` (componente `logout-notice.tsx`, misma lógica) para que aparezca en la página a la que redirige `/`. `app.tsx` y `tests/app.test.tsx` se eliminan; su test pasa a `tests/components/layout.test.tsx`.

### Componentes y archivos (`src/features/catalogo/`)

- `catalog-api.ts`: `getCategories()` y `getProducts({ category, page, sort })`, con los tipos `Category`, `Product`, `Page<T>`.
- `use-catalog-queries.ts`: `useCategories()` y `useProducts(category, page)` sobre `@tanstack/react-query`. Claves `['catalog', 'categories']` y `['catalog', 'products', category, page]`; `placeholderData: keepPreviousData` para que al paginar la grilla no parpadee.
- `components/category-list.tsx`: lista vertical de enlaces (`NavLink`), con la activa resaltada (`aria-current="page"`).
- `components/product-card.tsx`: `Card` del design system con imagen principal (o imagen de reemplazo si `imageUrl` es `null` o falla la carga, vía `onError`), nombre, precio formateado `S/ 32.00` y calificación como estrella + número (SVG inline, sin emojis; si es `null` no se muestra).
- `components/sort-select.tsx`: `<select>` nativo con etiqueta "Ordenar por" y las seis opciones, estilizado con los tokens del `Input` del design system; `appearance-none` con un chevron propio y `pr-11` para que la flecha tenga margen a la derecha. Cambiarlo borra `page` de la URL.
- `components/product-grid.tsx`: grilla de 3 columnas en escritorio. Esqueletos mientras carga; mensaje "No se encontraron productos" si `items` viene vacío (cubre categoría vacía y categoría inexistente).
- `src/components/card.tsx` (nuevo, reutilizable): wrapper de `design-system/components/Card` con utilities de Tailwind (fondo `surface`, borde, `rounded-lg`, `p-4`, `shadow-sm`).
- `src/components/pagination.tsx` (nuevo, genérico para reutilizarse en HU-09): botones Anterior/Siguiente y números de página, `aria-current` en la actual, deshabilitados en los extremos; no se muestra si `totalPages <= 1`.
- Encabezado "Mostrando {desde}-{hasta} de {total} elementos": `desde = (page-1)*pageSize+1`, `hasta = min(page*pageSize, total)`; con `total = 0` no se muestra.
- La imagen de reemplazo: SVG en `frontend/public/` (sin colores nuevos; tokens `surface`/`ink-muted` del design system).

### Componentes del design system

`Card` (tarjeta de plato; tocable más adelante con HU-08, por ahora sin acción). No se usa `Button` para la paginación de la lista salvo Anterior/Siguiente (variante `secondary`).

## Seguridad

- Endpoints públicos y de solo lectura; no exponen datos de usuario ni plato inactivo (siempre se filtra por `is_active = true` en la consulta, no en el frontend).
- `category` y `page` van como parámetros enlazados de JPA; no se concatenan en SQL. No hay entrada libre más allá del `slug`.
- Tamaño de página fijo en el servidor: el cliente no puede pedir listas enormes.
- La URL de imagen se construye en el servidor desde configuración; el frontend nunca arma rutas de MinIO.

## Decisiones

- **`GET /api/products?category=` en vez de `/api/categories/{category}`**: el recurso devuelto son productos; HU-08, HU-09 y HU-11 reutilizan `/api/products` con otros parámetros (`/{id}`, `q`, `featured`).
- **Categoría inexistente = `200` vacío**: lo decidió el negocio (mismo mensaje en el frontend); evita un `404` que obligaría a distinguir dos casos que se muestran igual.
- **`page` 1-based también en la API**: coincide con la URL (`?page=2`) y evita una conversión que se olvide en un lado.
- **Sin caché Redis en esta historia**: no hay nada que invalide la caché hasta HU-29, y una carta de decenas de platos con índice por categoría no lo necesita; se agrega con su invalidación.
- **Tarjeta compacta (opción B elegida por el usuario)**: imagen cuadrada, nombre y, en la misma fila, precio y calificación; sin descripción (queda para el detalle, HU-08). `ProductResponse` igual incluye `description` para que HU-08/HU-09 no cambien el contrato.
- **`slug` como columna**: estable ante renombres y sin lógica de normalización (tildes, espacios) repetida en cliente y servidor.
- **Seed de platos solo en dev**: un plato sin imagen subida a MinIO no es un dato de producción; las categorías sí van en `V2` porque la app no funciona sin ellas.
- **Imágenes en dev**: el `docker-compose.dev.yml` no incluye MinIO (ver `AGENTS.md`), así que en local todas las tarjetas mostrarán la imagen de reemplazo; es el mismo camino que el de una imagen rota en producción.
- **Bucket público**: Traefik sirve `media.…` directamente, por lo que el bucket `platos` necesita política de lectura anónima. Es configuración de despliegue, no de esta historia.

## Impacto en docs/

- `docs/diagrama-de-base-de-datos.md`: agregar `categories`, `products` y `product_images` con sus relaciones y quitar la frase que dice que el catálogo "se incorporará en iteraciones posteriores". La imagen `images/database-diagram.png` debe regenerarse (el usuario la edita fuera del repo; dejar el aviso en el PR).
- `docs/diagrama-de-arquitectura.md`: sin cambios (la capa de repositorios y MinIO ya cubren el catálogo).
