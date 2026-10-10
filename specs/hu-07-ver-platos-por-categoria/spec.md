# Spec: HU-07 — Ver los platos organizados por categorías

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente pueda ver los platos de Salazar SAC filtrados por categoría (entradas, ceviches, chicharrones, fondos, bebidas) para encontrar rápido lo que busca, sin recorrer todo el catálogo.

## Contexto (qué ya existe y qué falta)

Hasta HU-06 el sistema solo modela autenticación (`users`, `refresh_tokens`, `password_reset_tokens`). No existe ningún concepto de plato, categoría ni imagen: esta historia introduce el modelo de datos del catálogo, que luego reutilizan HU-08 (detalle), HU-09 (búsqueda), HU-10 (disponibilidad), HU-11 (destacados), el carrito (E3) y la administración de platos (HU-29).

Las imágenes viven en MinIO (ver `docs/diagrama-de-arquitectura.md`); la base de datos solo guarda la referencia al objeto, nunca el binario.

La pantalla de esta historia es también la que mostrará los resultados de una búsqueda (HU-09), que se implementa después: el listado de platos con su paginación debe poder reutilizarse tal cual.

## Actor(es)

Visitante y Cliente. El catálogo es público: no requiere iniciar sesión.

## Modelo de datos

### Producto (plato)

| Atributo      | Descripción                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `id`          | Identificador.                                                                        |
| `name`        | Nombre del plato.                                                                     |
| `description` | Descripción corta del plato.                                                          |
| `price`       | Precio en soles, con dos decimales (se muestra como `S/ 32.00`).                      |
| `category`    | Categoría a la que pertenece (relación con la clase Categoría; un plato tiene una).   |
| `rating`      | Calificación promedio, de 0.0 a 5.0 inclusive, un decimal. `null` si aún no tiene.    |
| `images`      | Imágenes del plato (relación con la clase Imagen; un plato tiene una o más).          |
| `created_at`  | Fecha y hora de creación.                                                             |
| `active`      | Si el plato está visible en el catálogo (`is_active` en BD, igual que `users`).       |

### Categoría

Clase aparte. Agrupa platos. Sin orden propio ni estado.

| Atributo | Descripción                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------- |
| `id`     | Identificador.                                                                                      |
| `name`   | Nombre visible de la categoría (único, sin distinguir mayúsculas).                                  |
| `slug`   | Identificador para la URL (único): minúsculas, sin tildes ni espacios (`chicharrones`). No cambia aunque se renombre la categoría. |

Categorías iniciales (migración de semilla), con su `slug`: Entradas (`entradas`), Ceviches (`ceviches`), Chicharrones (`chicharrones`), Fondos (`fondos`), Bebidas (`bebidas`).

### Imagen

Clase aparte. Cada fila describe un objeto guardado en MinIO.

| Atributo     | Descripción                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `id`         | Identificador.                                                                                                 |
| `product`    | Plato al que pertenece.                                                                                        |
| `path`       | Clave del objeto dentro del bucket de MinIO (por ejemplo `ceviche-clasico-1.jpg`), no la URL completa.  |
| `position`   | Orden de la imagen dentro del plato; la de menor posición es la principal.                                     |
| `created_at` | Fecha y hora en que se subió.                                                                                  |

La URL pública se arma en el backend con la base de `media.cevicheria-salazar.com` (en desarrollo, la que se configure) más el `path`; así un cambio de dominio no obliga a migrar datos.

### Relaciones

- `categories (1) — (N) products`: una categoría agrupa varios platos; cada plato pertenece a una sola categoría.
- `products (1) — (N) images`: un plato tiene varias imágenes; al eliminar un plato se eliminan sus filas de imagen (el objeto en MinIO lo limpia la capa de servicios).

## Pantalla

Layout (de izquierda a derecha, bajo el header de la app):

- **Columna izquierda**: lista de categorías; la categoría activa se distingue visualmente. Cada categoría es un enlace a `/{category}`, donde `category` es su `slug`.
- **Área principal**: encabezado con "Mostrando 1-20 de 40 elementos" a la izquierda y, a la derecha, un selector "Ordenar por"; debajo una grilla de tarjetas de plato (3 por fila en escritorio), con los controles de paginación al pie.
- **Tarjeta de plato**: imagen principal, nombre, precio (`S/ 32.00`) y calificación.

## Criterios de aceptación

- **Dado** que abro `/{category}` (por ejemplo `/ceviches`), **cuando** carga la pantalla, **entonces** veo las categorías a la izquierda con esa resaltada y, a la derecha, los platos activos de esa categoría.
- **Dado** que la categoría tiene más de 20 platos, **cuando** abro la pantalla, **entonces** veo los primeros 20 y el encabezado dice "Mostrando 1-20 de N elementos"; **y cuando** paso a la página siguiente, veo los siguientes 20 con el encabezado actualizado (por ejemplo "Mostrando 21-40 de 40 elementos").
- **Dado** que estoy en la página 2 de una categoría, **cuando** recargo la página o comparto el enlace, **entonces** vuelvo a ver esa misma página (la página va en la URL, `?page=2`).
- **Dado** que elijo otra categoría en la lista de la izquierda, **cuando** hago clic, **entonces** la URL cambia a `/{slug-de-la-otra}`, se muestra desde la página 1 y la categoría resaltada cambia.
- **Dado** que veo los platos de una categoría, **cuando** abro el selector de orden, **entonces** puedo elegir entre: "Nombre: ascendente", "Nombre: descendente", "Precio: ascendente", "Precio: descendente", "Popularidad: ascendente" y "Popularidad: descendente"; por defecto está "Nombre: ascendente".
- **Dado** que elijo un orden, **cuando** la lista se actualiza, **entonces** el orden se aplica a **toda** la categoría (no solo a la página visible), vuelvo a la página 1 y el orden queda en la URL (`?sort=price_desc`), de modo que recargar o compartir el enlace conserva el orden.
- **Dado** que cambio de página con un orden elegido, **cuando** voy a la página siguiente, **entonces** el orden se mantiene.
- **Dado** que cambio de categoría, **cuando** abro la nueva, **entonces** vuelve el orden por defecto (el orden va en la URL de la categoría anterior, no se arrastra).
- **Dado** que veo una tarjeta, **cuando** la miro, **entonces** muestra imagen principal, nombre, precio con formato `S/ 32.00` y calificación (sin estrellas si el plato no tiene calificación).
- **Dado** que un plato está inactivo (`active = false`), **cuando** abro su categoría, **entonces** no aparece ni cuenta en el total.
- **Dado** que un plato no tiene imágenes, **cuando** aparece en la grilla, **entonces** se muestra con una imagen de reemplazo en lugar de un recuadro roto.
- **Dado** que la categoría no tiene platos activos, **cuando** la abro, **entonces** veo el mensaje "No se encontraron productos" (las categorías se siguen listando a la izquierda).
- **Dado** que abro `/{category}` con un valor que no corresponde a ninguna categoría (por ejemplo `/pizzas`), **cuando** carga, **entonces** veo el mismo mensaje "No se encontraron productos", sin categoría resaltada. No hay pantalla de error ni redirección.
- **Dado** que abro `/`, **cuando** carga, **entonces** me lleva a la primera categoría de la lista.
- **Dado** que no he iniciado sesión, **cuando** abro cualquier categoría, **entonces** la veo igual (endpoint público).

## Casos borde

- Página fuera de rango (`?page=99`, `?page=0` o no numérica): se muestra la última página válida (si es mayor al total) o la primera (si es menor a 1 o no numérica); no hay error.
- Un `path` de imagen que ya no existe en MinIO: el frontend muestra la imagen de reemplazo; no debe romper la grilla.
- Dos categorías con el mismo nombre en distinto formato (`Bebidas` / `bebidas`): la unicidad debe ser insensible a mayúsculas.
- La ruta `/{category}` compite con rutas fijas (`/registro`, `/iniciar-sesion`, `/olvide-contrasena`, `/restablecer-contrasena`, `/admin`, etc.): las rutas fijas tienen prioridad y sus nombres no pueden usarse como `slug`.
- Un `slug` es estable: si el negocio renombra una categoría, el enlace sigue funcionando.
- Orden del listado: ante empate en el criterio elegido (mismo precio, mismo rating) se desempata por nombre y luego por `id`, de modo que la paginación sea estable entre páginas.
- "Popularidad" ordena por `rating` (ascendente: de menor a mayor; descendente: de mayor a menor) y en ambos sentidos deja al final los platos sin calificación (`null`), porque no tener calificación no es lo mismo que tener la peor.
- Valor de `sort` desconocido en la URL (`?sort=xyz`): se usa el orden por defecto, sin error.
- Esta historia no cachea en Redis: se lee directo de PostgreSQL. Cuando se agregue caché al catálogo (junto con HU-29, que es lo que la invalida), editar o desactivar un plato deberá invalidarla.

## Fuera de alcance

- Detalle de un plato (HU-08), búsqueda por nombre (HU-09), indicador de agotado (HU-10) y destacados/promociones (HU-11). La pantalla se reutilizará para los resultados de HU-09, pero aquí no hay buscador.
- Crear, editar o desactivar platos y categorías desde el panel `/admin` (HU-29); aquí solo se leen. Los datos iniciales entran por una migración de semilla.
- Cómo se calcula o actualiza el `rating` (no hay reseñas en el backlog); aquí es solo un dato que se muestra.
- Subir imágenes a MinIO desde la app (HU-29).
- Agregar al carrito desde la tarjeta (HU-12) y navegar al detalle al hacer clic (HU-08).
- Orden de aparición configurable de las categorías.
- Layout para celular: se define en una iteración posterior; esta historia cubre solo escritorio.

## Decisiones de clarificación

- **Rating**: `0.0 <= rating <= 5.0`, `NUMERIC(2,1)`, `null` permitido.
- **Categoría**: solo `id` y `name`; sin `position` ni `active`.
- **Categorías iniciales**: Entradas, Ceviches, Chicharrones, Fondos, Bebidas.
- **Convención de `active`**: `is_active` en BD, consistente con `users`.
- **Paginación**: de 20 en 20, una categoría a la vez (no se agrupa todo el catálogo en una sola pantalla).
- **Ruta**: `/{category}` en el frontend (el valor es el `slug`); `/` redirige a la primera categoría. Los paths y parámetros de URL van en inglés.
- **Categoría inexistente**: solo el frontend lo trata; muestra el mismo mensaje que una categoría sin platos ("No se encontraron productos").
- **`slug`**: columna propia de `categories`, no se deriva del nombre en cada petición.
- **Endpoints**: `GET /api/categories` (lista) y `GET /api/products?category={slug}&page={n}` (platos paginados); el detalle, la búsqueda y los destacados de HU-08/09/11 extenderán `/api/products`.
- **Orden de platos**: opciones `name_asc` (por defecto), `name_desc`, `price_asc`, `price_desc`, `rating_asc` y `rating_desc`, enviadas como `sort` y mantenidas en la URL. "Popularidad" se mide con el `rating`.
- **Orden de la lista de categorías**: por `id` (orden de la semilla: Entradas, Ceviches, Chicharrones, Fondos, Bebidas).
- **Imagen**: el modelo admite varias por plato (`position`); la tarjeta solo muestra la primera, la galería es de HU-08.
