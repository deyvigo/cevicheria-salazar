# Spec: HU-31 — Gestionar las categorías del catálogo

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador cree, edite y elimine las categorías del catálogo desde la sección **Categorías** del panel `/admin`, para organizar la carta sin depender de migraciones de base de datos.

## Contexto (qué ya existe y qué falta)

- HU-07 introdujo el modelo `categories` (`id`, `name` único sin distinguir mayúsculas, `slug` único) con cinco categorías de semilla, y las expone solo en lectura: la tienda las lista a la izquierda y cada una es un enlace `/menu/{slug}`.
- HU-28 creó el panel con la sección **Categorías** (`/admin/categorias`), hoy vacía, y la protección por rol `ADMINISTRADOR` tanto en las pantallas como en la API.
- HU-07 declaraba el `slug` como estable aunque se renombre la categoría. Esta historia **cambia esa regla**: el `slug` pasa a ser editable (ver Decisiones de clarificación) y HU-07 y `docs/diagrama-de-base-de-datos.md` se actualizan en el mismo cambio.
- Los platos referencian su categoría (`products.category_id`). La gestión de platos (HU-29) elige la categoría de una lista; esta historia solo gestiona las categorías en sí.

## Actor(es)

Administrador con sesión iniciada. Visitante y Cliente no tienen acceso (ver Seguridad).

## Criterios de aceptación

### Ver

- **Dado** que estoy en `/admin/categorias`, **cuando** carga la sección, **entonces** veo una tabla con las columnas **Nombre**, **Slug** (mostrado con una `/` delante, por ejemplo `/ceviches`), **Platos** (cantidad asociada) y **Acciones** ("Editar" y "Eliminar"), con una fila por categoría, ordenadas por nombre ascendente, de 20 en 20.
- **Dado** que hay más de 20 categorías, **cuando** abro la sección, **entonces** veo las primeras 20 y la navegación de páginas; **y cuando** paso a la siguiente, veo las siguientes 20. La página va en la URL (`?page=2`), de modo que recargar conserva la página.
- **Dado** que hay 20 categorías o menos (una sola página), **cuando** abro la sección, **entonces** no se muestra la navegación de páginas.
- **Dado** que elimino la única categoría de la última página, **cuando** la lista se actualiza, **entonces** vuelvo a la página anterior (la última que exista).
- **Dado** que no existen categorías, **cuando** abro la sección, **entonces** veo un estado vacío ("Aún no tienes categorías") con la opción de agregar una; sin categorías no hay nada que buscar, así que el buscador no se muestra.
- **Dado** que la pantalla aún no recibió las categorías, **cuando** la abro, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.

### Buscar

- **Dado** que existen categorías, **cuando** abro la sección, **entonces** veo un buscador al lado del botón "Agregar categoría".
- **Dado** que escribo un texto en el buscador, **cuando** lo envío (Enter o el botón de buscar), **entonces** la tabla muestra solo las categorías cuyo nombre **o** `slug` contienen ese texto, **sin distinguir mayúsculas** (`ceviche`, `CEVICHE` y `Ceviche` encuentran lo mismo), de 20 en 20 y por nombre ascendente; vuelvo a la página 1 y el texto queda en la URL (`?q=ceviche`), de modo que recargar o compartir el enlace conserva la búsqueda.
- **Dado** que busco por un texto que solo aparece en el `slug` (por ejemplo `fresc` en `bebidas-frescas`), **cuando** envío la búsqueda, **entonces** esa categoría aparece.
- **Dado** que busco un texto que no coincide con ninguna categoría, **cuando** envío la búsqueda, **entonces** veo el mensaje "No se encontraron categorías" con el texto buscado, el buscador y el botón "Agregar categoría" siguen visibles, y no se muestra la navegación de páginas.
- **Dado** que hay una búsqueda activa, **cuando** vacío el buscador y lo envío, **entonces** vuelvo a ver todas las categorías (se quita `?q=` de la URL).
- **Dado** que hay una búsqueda activa, **cuando** creo, edito o elimino una categoría, **entonces** la tabla sigue mostrando los resultados de esa búsqueda, actualizados.
- **Dado** que escribo `%` o `_`, **cuando** envío la búsqueda, **entonces** se buscan como texto literal, no como comodines.

### Crear

- **Dado** que veo las categorías, **cuando** elijo "Agregar categoría", **entonces** se abre un diálogo con un formulario vacío con nombre y `slug`.
- **Dado** que estoy creando una categoría y el `slug` está sin tocar, **cuando** escribo el nombre, **entonces** el `slug` se propone solo a partir del nombre (minúsculas, sin tildes, espacios como guiones); si edito el `slug` a mano, deja de seguir al nombre.
- **Dado** que completo nombre y `slug` válidos, **cuando** guardo, **entonces** la categoría se crea, el diálogo se cierra, aparece en la lista, en el menú de la tienda, y veo la notificación "Categoría agregada".
- **Dado** que dejo vacío el nombre o el `slug`, **cuando** intento guardar, **entonces** veo qué campo falta y no se envía la solicitud.
- **Dado** que escribo un nombre o `slug` que excede el largo máximo o un `slug` con formato inválido, **cuando** intento guardar, **entonces** veo el motivo y no se envía la solicitud.
- **Dado** que el nombre ya existe (sin distinguir mayúsculas) o el `slug` ya existe, **cuando** guardo, **entonces** el diálogo sigue abierto con mis datos y un mensaje en el campo repetido ("Ya existe una categoría con ese nombre" / "Ya existe una categoría con ese enlace").
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** guardo, **entonces** el diálogo sigue abierto con mis datos y el mensaje "No pudimos guardar la categoría, intenta de nuevo".
- **Dado** que cierro el diálogo (Cancelar, Escape o tocar fuera) sin guardar, **cuando** lo reabro, **entonces** el formulario está vacío.

### Editar

- **Dado** que veo una categoría, **cuando** elijo "Editar", **entonces** se abre el mismo diálogo con su nombre y `slug` cargados.
- **Dado** que modifico nombre y/o `slug` con valores válidos, **cuando** guardo, **entonces** los cambios se guardan, el diálogo se cierra, la lista muestra los valores nuevos y veo la notificación "Categoría actualizada".
- **Dado** que estoy editando una categoría existente, **cuando** cambio el nombre, **entonces** el campo `slug` no se modifica ni se propone otro; el `slug` solo cambia si lo edito yo a mano.
- **Dado** que estoy editando una categoría existente y cambio su `slug`, **cuando** miro el campo, **entonces** veo bajo él el aviso "Los enlaces anteriores dejarán de funcionar" (sin confirmación adicional).
- **Dado** que abro el diálogo y no cambié nada, **cuando** miro "Guardar", **entonces** está deshabilitado.
- **Dado** que cambié campos, **cuando** cierro el diálogo (Cancelar, Escape o tocar fuera), **entonces** no se guarda nada y al reabrirlo veo los valores guardados.
- **Dado** que el nombre o el `slug` nuevo ya pertenece a **otra** categoría, **cuando** guardo, **entonces** se rechaza con los mismos mensajes de la creación; conservar mi propio nombre o `slug` no cuenta como repetido.
- **Dado** que cambié el `slug` de una categoría, **cuando** un cliente abre el enlace con el `slug` que la categoría tenía antes (por ejemplo `/menu/ceviches` tras cambiarlo a `ceviches-frescos`), **entonces** ve "No se encontraron productos" (ver Casos borde).
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** guardo, **entonces** el diálogo sigue abierto con mis ediciones y el mensaje "No pudimos guardar la categoría, intenta de nuevo".

### Eliminar

- **Dado** que veo una categoría **sin platos asociados**, **cuando** elijo "Eliminar", **entonces** se abre un diálogo de confirmación que muestra su nombre, con "Eliminar" y "Cancelar".
- **Dado** que confirmo, **cuando** el servidor responde, **entonces** la categoría desaparece de la lista y del menú de la tienda, el diálogo se cierra y veo la notificación "Categoría eliminada". La eliminación es **definitiva** (se borra la fila).
- **Dado** que veo una categoría **con uno o más platos asociados** (activos o inactivos), **cuando** miro sus acciones, **entonces** "Eliminar" está deshabilitado y al pasar el cursor por encima (o enfocarlo con el teclado) aparece un aviso que indica por qué ("Tiene N platos asociados: muévelos a otra categoría antes de eliminarla"); el aviso no está visible de forma permanente.
- **Dado** que intento eliminar una categoría que tiene platos asociados (por ejemplo, porque se le asignó un plato después de cargar la lista, o llamando a la API directamente), **cuando** el servidor la recibe, **entonces** responde 409, no borra nada y el diálogo muestra "No se puede eliminar: tiene platos asociados".
- **Dado** que cancelo la confirmación (Cancelar, Escape o tocar fuera), **cuando** el diálogo se cierra, **entonces** la categoría sigue en la lista.
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** confirmo, **entonces** el diálogo sigue abierto con el mensaje "No pudimos eliminar la categoría, intenta de nuevo" y la categoría sigue en la lista.

### Seguridad

- **Dado** que no soy Administrador, **cuando** llamo a los endpoints de gestión de categorías, **entonces** la API responde "no autenticado" (sin sesión) o "prohibido" (Cliente) y no devuelve ni modifica datos. La lectura pública de HU-07 no cambia.
- **Dado** que intento editar o eliminar una categoría que no existe (por ejemplo, ya eliminada desde otra pestaña), **cuando** el servidor la recibe, **entonces** responde 404.

## Casos borde

- Espacios al inicio o al final de nombre y `slug` se ignoran. El `slug` se normaliza a minúsculas antes de validar.
- Formato del `slug`: minúsculas ASCII, dígitos y guiones simples (sin guion al inicio o al final ni guiones consecutivos), hasta 80 caracteres. El nombre admite hasta 80 caracteres (los de la columna actual).
- Unicidad del nombre: sin distinguir mayúsculas (`Bebidas` / `bebidas`), igual que en HU-07; la del `slug` es exacta tras normalizar.
- **Sin slugs reservados**: las categorías viven bajo `/menu/{slug}`, así que ningún `slug` puede chocar con una ruta fija (`/admin`, `/registro`, `/perfil`, etc.).
- **Renombrar el `slug` rompe los enlaces antiguos** compartidos por los clientes: no hay redirección desde el `slug` que tenía antes (ver Fuera de alcance). Se acepta porque las categorías cambian rara vez.
- Un cliente con la tienda abierta en la categoría que se renombró, cambió de `slug` o se eliminó verá el cambio al recargar o navegar; la pantalla muestra "No se encontraron productos" si ya no existe.
- La cuenta de platos asociados incluye platos inactivos: un plato inactivo sigue referenciando la categoría y bloquea su eliminación.
- Carrera entre eliminar y asignar un plato: la restricción la garantiza el servidor al eliminar (409), no solo la pantalla; la base de datos mantiene la clave foránea de `products.category_id`.
- Dos administradores (o dos pestañas) editando la misma categoría: gana el último guardado; si uno la eliminó, el otro recibe 404 al guardar y ve el mensaje de error genérico.
- La sesión vence con un diálogo abierto: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión y se pierden las ediciones no guardadas.
- Las categorías de semilla de HU-07 se pueden editar y eliminar como cualquier otra (si no tienen platos).
- Si se eliminan todas las categorías, la tienda muestra el menú solo con "Todos" y los platos activos; como no puede haber platos sin categoría, el catálogo queda vacío.
- Una tienda ya abierta guarda las categorías en memoria hasta 5 minutos; el cambio del Administrador se ve al recargar o pasado ese tiempo, no al instante.
- Si borro la única categoría de la última página, la lista retrocede a la página anterior; si la página pedida en la URL ya no existe, se muestra la última.

## Fuera de alcance

- Crear, editar o eliminar platos, o reasignar platos de una categoría a otra (HU-29): para eliminar una categoría con platos, primero hay que moverlos desde la gestión de platos.
- Eliminar una categoría junto con sus platos, o reasignar sus platos automáticamente al eliminarla.
- Buscar sin distinguir tildes (la búsqueda solo ignora mayúsculas), buscar mientras se escribe, o filtrar por cantidad de platos.
- Redirección desde el `slug` que la categoría tenía antes al nuevo (historial de slugs).
- Orden de aparición configurable, descripción, imagen o estado activo/inactivo de la categoría (HU-07 ya descartó `position` y `active`).
- Eliminación lógica o restauración de categorías eliminadas.
- Página 404 propia de la tienda (solo se muestra "No se encontraron productos", como en HU-07).

## Decisiones de clarificación

- **Campos editables**: `name` y `slug`. Los dos son obligatorios y únicos (el nombre sin distinguir mayúsculas).
- **Crear**: se incluye porque "gestionar" lo implica; mismos campos y reglas que editar.
- **Eliminar**: solo si la categoría no tiene platos asociados (activos o inactivos); borrado físico, sin papelera.
- **`slug` editable**: reemplaza la regla de HU-07 "el `slug` no cambia aunque se renombre". Al editar el nombre, el `slug` no se regenera solo; solo se propone automáticamente al crear.
- **Enlaces antiguos**: sin redirección; el `slug` que tenía antes deja de resolver. Al editar una categoría existente se avisa bajo el campo `slug` ("Los enlaces anteriores dejarán de funcionar"), sin confirmación adicional.
- **Slug propuesto**: solo al crear una categoría; cambiar el nombre de una existente nunca regenera ni propone un `slug`.
- **Búsqueda**: por nombre o `slug`, texto contenido (no solo prefijo), sin distinguir mayúsculas pero sí tildes; se envía con Enter o el botón; el texto buscado se recorta y se limita a 100 caracteres. Reutiliza la paginación de 20 en 20.
- **Paginación**: la lista del panel se pagina de 20 en 20, ordenada por nombre ascendente; con una sola página no se muestra la navegación de páginas.

## Preguntas abiertas

Ninguna.
