# Spec: HU-29 — Crear, editar y eliminar platos

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador cree, edite y elimine los platos de la carta desde la sección **Platos** del panel `/admin` (nombre, descripción, imágenes, precio, categoría, stock, activo y disponible), para mantener el catálogo actualizado sin tocar la base de datos.

## Contexto (qué ya existe y qué falta)

- HU-07/HU-08 introdujeron `products` y `product_images` y los exponen solo en lectura; los platos y sus imágenes de hoy salen de datos de semilla.
- HT-10 dejó el almacenamiento de objetos (Garage, SDK de AWS S3) y `ImageUrlResolver`; el backend solo lo usa hoy para armar URLs, todavía no sube ni borra objetos.
- HU-10/HU-30: `is_available` indica si un plato se puede pedir hoy; `stock` son las unidades del día. Un plato se puede pedir solo si `is_available` y `stock > 0`. HU-30 los cambia con rapidez desde la tabla (interruptores); aquí también se editan desde el formulario del plato.
- HU-28 creó el panel `/admin` y HU-31 la sección **Categorías** (tabla, buscador, paginación y diálogos); esta historia replica ese patrón para los platos.
- `products` no tiene borrado lógico todavía; esta historia lo agrega (`deleted_at`, igual que `addresses` en HU-24).

## Actor(es)

Administrador con sesión iniciada. Visitante y Cliente no tienen acceso (ver Seguridad).

## Criterios de aceptación

### Ver

- **Dado** que estoy en `/admin/platos`, **cuando** carga la sección, **entonces** veo una tabla con las columnas **Imagen** (miniatura de la principal), **Nombre**, **Categoría**, **Precio** (`S/ 32.00`), **Stock**, **Rating** (`4.5`, o `—` si aún no tiene), **Activo**, **Disponible** y **Acciones** ("Editar" y "Eliminar"), con una fila por plato (activos e inactivos, sin los eliminados), ordenados por nombre ascendente, de 15 en 15.
- **Dado** que hay más de 15 platos, **cuando** abro la sección, **entonces** veo la navegación de páginas y la página va en la URL (`?page=2`); con una sola página no se muestra.
- **Dado** que elimino el único plato de la última página, **cuando** la lista se actualiza, **entonces** vuelvo a la página anterior (la última que exista).
- **Dado** que no existen platos, **cuando** abro la sección, **entonces** veo el estado vacío ("Aún no tienes platos") con la opción de agregar uno; sin platos el buscador no se muestra.
- **Dado** que la pantalla aún no recibió los platos, **cuando** la abro, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.
- **Dado** un plato sin imagen, **cuando** veo la tabla, **entonces** la miniatura muestra la imagen de reemplazo de la tienda.

### Ordenar

- **Dado** que veo la tabla, **cuando** la abro, **entonces** está ordenada por **Nombre** ascendente (sin distinguir mayúsculas) y ese encabezado lo indica con una flecha.
- **Dado** que elijo el encabezado **Nombre**, **Categoría**, **Precio**, **Stock** o **Rating**, **cuando** hago clic, **entonces** la tabla se ordena por esa columna de forma ascendente; si vuelvo a hacer clic en la misma, pasa a descendente. Cambiar de columna empieza siempre en ascendente y en la página 1.
- **Dado** que ordeno por **Rating**, **cuando** hay platos sin calificación, **entonces** van al final en ambas direcciones (no tener calificación no es tener la más baja).
- **Dado** que dos platos empatan en la columna elegida, **cuando** se ordena, **entonces** se desempatan por nombre y luego por identificador, para que la paginación sea estable.
- **Dado** que ordeno, **cuando** busco, pago de página, creo, edito o elimino un plato, **entonces** el orden elegido se conserva; el orden va en la URL (`?sort=price&dir=desc`, sin `sort`/`dir` cuando es Nombre ascendente), de modo que recargar o compartir el enlace lo conserva.
- **Dado** un lector de pantalla, **cuando** llego a un encabezado ordenable, **entonces** lo anuncia como botón y la columna activa indica su dirección (`aria-sort`).
- **Dado** un valor de orden desconocido en la URL o en la API, **cuando** se aplica, **entonces** se usa Nombre ascendente.

### Buscar

- **Dado** que existen platos, **cuando** abro la sección, **entonces** veo un buscador al lado del botón "Agregar plato".
- **Dado** que escribo un texto y lo envío (Enter o botón), **cuando** se aplica, **entonces** la tabla muestra solo los platos cuyo nombre contiene ese texto, sin distinguir mayúsculas ni tildes (igual que HU-09), de 15 en 15; vuelvo a la página 1 y el texto queda en la URL (`?q=`).
- **Dado** que busco un texto sin coincidencias, **cuando** lo envío, **entonces** veo "No se encontraron platos" con el texto buscado, el buscador y el botón "Agregar plato" siguen visibles, y no hay navegación de páginas.
- **Dado** que vacío el buscador y lo envío, **cuando** se aplica, **entonces** vuelvo a ver todos los platos.
- **Dado** que hay una búsqueda activa, **cuando** creo, edito o elimino un plato, **entonces** la tabla sigue mostrando esa búsqueda, actualizada.
- **Dado** que escribo `%` o `_`, **cuando** envío la búsqueda, **entonces** se buscan como texto literal.

### Crear

- **Dado** que veo los platos, **cuando** elijo "Agregar plato", **entonces** se abre un diálogo con el formulario vacío: nombre, descripción, categoría (lista de las categorías existentes), precio, stock, imágenes, y los interruptores (switch) **Activo** y **Disponible**, en una misma fila a mitad de ancho cada uno y ambos desactivados por defecto (el plato nuevo no se publica ni se puede pedir hasta que el administrador lo active).
- **Dado** que completo los campos obligatorios con valores válidos, **cuando** guardo, **entonces** el plato se crea, el diálogo se cierra, aparece en la lista, en la tienda (si está activo) y veo la notificación "Plato agregado".
- **Dado** que dejo vacío nombre, descripción, categoría, precio o stock, o no agrego ninguna imagen, **cuando** intento guardar, **entonces** veo qué campo falta y no se envía la solicitud.
- **Dado** un valor fuera de rango (nombre de más de 150 caracteres, descripción de más de 1000, precio negativo, con más de dos decimales o mayor que 9999.99, stock negativo, no entero o mayor que 9999), **cuando** intento guardar, **entonces** veo el motivo y no se envía la solicitud.
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** guardo, **entonces** el diálogo sigue abierto con mis datos (incluidas las imágenes elegidas) y el mensaje "No pudimos guardar el plato, intenta de nuevo".
- **Dado** que cierro el diálogo (Cancelar, Escape o tocar fuera) sin guardar, **cuando** lo reabro, **entonces** el formulario está vacío.
- **Dado** que no existe ninguna categoría, **cuando** abro el formulario, **entonces** la lista de categorías está vacía y un aviso me dirige a **Categorías** para crear una primero; no se puede guardar.

### Imágenes

- **Dado** el formulario (al crear o editar), **cuando** miro las imágenes, **entonces** las veo como una lista ordenada de miniaturas numeradas; la primera es la **principal** (se marca como tal) y es la que muestra la tarjeta del catálogo.
- **Dado** que elijo archivos con "Agregar imágenes" (o los suelto en el área), **cuando** son válidos, **entonces** se agregan al final de la lista con su vista previa, sin subirse todavía.
- **Dado** una miniatura, **cuando** la arrastro a otra posición, **entonces** cambia de posición; si la muevo al primer lugar, pasa a ser la principal. Con teclado, enfoco la miniatura y uso Alt con las flechas izquierda y derecha.
- **Dado** una miniatura, **cuando** elijo **Quitar**, **entonces** sale de la lista sin afectar a las demás; no se pide confirmación porque nada cambia hasta guardar.
- **Dado** que agrego, quito y reordeno imágenes, **cuando** guardo, **entonces** el plato queda con exactamente esas imágenes en ese orden: las nuevas se suben, las quitadas se borran del almacenamiento y las conservadas no se vuelven a subir.
- **Dado** que cancelo o cierro el diálogo con cambios en las imágenes, **cuando** lo reabro, **entonces** veo las imágenes guardadas; no se subió ni borró nada.
- **Dado** un archivo que no es JPEG, PNG o WebP, o que pesa más de 5 MB, **cuando** lo elijo, **entonces** se rechaza con un mensaje bajo el área ("Solo JPG, PNG o WebP de hasta 5 MB") y el resto de la selección se conserva.
- **Dado** que ya hay 5 imágenes, **cuando** intento agregar otra, **entonces** el botón "Agregar imágenes" está deshabilitado y se indica el máximo ("Máximo 5 imágenes").
- **Dado** que quito todas las imágenes, **cuando** intento guardar, **entonces** veo "Agrega al menos una imagen" y no se envía.

### Editar

- **Dado** que veo un plato, **cuando** elijo "Editar", **entonces** se abre el mismo diálogo con todos sus valores cargados (incluidas sus imágenes en orden).
- **Dado** que modifico nombre, descripción, categoría, precio, stock, imágenes, **Activo** o **Disponible** con valores válidos, **cuando** guardo, **entonces** los cambios se guardan, el diálogo se cierra, la lista y la tienda muestran los valores nuevos y veo la notificación "Plato actualizado".
- **Dado** que desactivo **Activo**, **cuando** guardo, **entonces** el plato desaparece de la tienda (catálogo, búsqueda, detalle) pero sigue en la tabla del panel con "Activo" en no.
- **Dado** que desactivo **Disponible**, **cuando** guardo, **entonces** el plato sigue visible en la tienda marcado como "Agotado" (HU-10).
- **Dado** la tabla, **cuando** miro las columnas **Activo** y **Disponible**, **entonces** cada fila muestra su estado con un interruptor que se puede cambiar sin abrir el diálogo (ver [HU-30](../hu-30-disponibilidad-platos/spec.md)).
- **Dado** que abro el diálogo y no cambié nada, **cuando** miro "Guardar", **entonces** está deshabilitado.
- **Dado** que cambié campos, **cuando** cierro el diálogo (Cancelar, Escape o tocar fuera), **entonces** no se guarda nada y al reabrirlo veo los valores guardados.
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** guardo, **entonces** el diálogo sigue abierto con mis ediciones y el mensaje "No pudimos guardar el plato, intenta de nuevo".
- **Dado** que edito un plato que ya fue eliminado (por ejemplo, desde otra pestaña), **cuando** guardo, **entonces** el servidor responde 404 y veo el mensaje de error genérico.

### Eliminar

- **Dado** que veo un plato (de cualquier estado: activo, inactivo, disponible o agotado), **cuando** elijo "Eliminar", **entonces** se abre un diálogo de confirmación que muestra su nombre, con "Eliminar" y "Cancelar". No existe ningún plato que no se pueda eliminar.
- **Dado** que confirmo, **cuando** el servidor responde, **entonces** el plato desaparece de la tabla y de toda la tienda (catálogo, búsqueda, destacados, detalle), el diálogo se cierra y veo la notificación "Plato eliminado".
- **Dado** que eliminé un plato, **cuando** reviso la base de datos, **entonces** la fila y sus imágenes siguen existiendo con `deleted_at` informado (eliminación **lógica**); nada se borra del almacenamiento ni se puede restaurar desde la app.
- **Dado** que cancelo la confirmación (Cancelar, Escape o tocar fuera), **cuando** el diálogo se cierra, **entonces** el plato sigue en la lista.
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** confirmo, **entonces** el diálogo sigue abierto con "No pudimos eliminar el plato, intenta de nuevo" y el plato sigue en la lista.
- **Dado** que elimino un plato que ya no existe o ya estaba eliminado, **cuando** el servidor lo recibe, **entonces** responde 404 y la lista se refresca.

### Seguridad

- **Dado** que no soy Administrador, **cuando** llamo a los endpoints de gestión de platos, **entonces** la API responde "no autenticado" (sin sesión) o "prohibido" (Cliente) y no devuelve ni modifica datos ni imágenes. Las lecturas públicas de la tienda no cambian de contrato.
- **Dado** un archivo cuyo contenido no es una imagen JPEG, PNG o WebP aunque su nombre o `Content-Type` lo declaren, **cuando** llega al servidor, **entonces** se rechaza con 400 y no se guarda nada.

## Casos borde

- Espacios al inicio o al final de nombre y descripción se ignoran. El nombre no es único: dos platos pueden llamarse igual.
- **Precio** en soles con dos decimales (`NUMERIC(10,2)` en BD; el formulario admite hasta `9999.99`); `0` es válido. **Stock** entero de 0 a 9999. Un plato nuevo no hereda el stock 0 de la columna: el formulario lo pide y lo propone con `0`.
- Un plato activo y disponible con stock 0 se sigue viendo "Agotado" en la tienda (regla de HU-10/HU-12: se pide solo con `available` y `stock > 0`); esta historia no cambia esa regla.
- **Guardar es atómico respecto a la base de datos**: si falla al subir una imagen, no se guarda ningún cambio del plato ni queda una imagen nueva a medias en el almacenamiento. Las imágenes quitadas se borran del almacenamiento solo después de confirmar la transacción; si ese borrado falla, el plato queda bien guardado y el objeto huérfano se ignora (no es visible para nadie).
- Las imágenes se guardan con un nombre generado (no el del archivo original) para evitar choques y rutas manipuladas; la ruta guardada es la clave del objeto, nunca la URL (regla de `product_images.path`).
- **Plato en un carrito**: el carrito vive en el navegador del cliente (HU-16). Si el administrador elimina o desactiva un plato que un cliente tiene en su carrito, el carrito deja de encontrarlo (el backend ya trata los inactivos como inexistentes al leer por id) y se comporta como con cualquier plato que desaparece (HU-13/HU-14).
- **Pedidos futuros**: el borrado lógico existe para que los pedidos históricos conserven el plato que compraron; ningún pedido existe todavía, así que no hay nada que verificar al respecto aquí.
- **Categoría con platos eliminados**: los platos eliminados lógicamente **siguen contando** en la cantidad de platos de la categoría y bloquean su eliminación (HU-31), porque la fila sigue referenciándola. Esto no cambia HU-31: su conteo y su regla ya cuentan todas las filas de `products`. El administrador no ve esos platos en el panel, pero el aviso de la categoría los incluye.
- Dos administradores editando el mismo plato: gana el último guardado; si uno lo eliminó, el otro recibe 404 al guardar.
- La sesión vence con un diálogo abierto: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión y se pierden las ediciones y las imágenes elegidas sin guardar.
- Cambiar la categoría de un plato lo muestra en la nueva categoría de la tienda; la tienda ya abierta lo ve al recargar o al vencer su caché (5 minutos).
- Si cambia una imagen, su URL cambia (nombre nuevo), así que ningún navegador muestra la imagen vieja desde caché.
- Si se pasa de página tras eliminar, o la página de la URL ya no existe, se muestra la última (igual que HU-31).

## Fuera de alcance

- Cambiar Activo y Disponible desde la tabla sin abrir el diálogo (HU-30) y editar el stock de forma rápida: el stock solo se edita desde el formulario.
- Destacar o promocionar platos (HU-11 usa sus propios datos), calificaciones o reseñas.
- Restaurar platos eliminados, ver una papelera, o borrado definitivo.
- Recortar, redimensionar o comprimir imágenes, o subir por URL.
- Edición de varios platos a la vez, importación/exportación masiva, o duplicar un plato.
- Filtrar la tabla por categoría o estado, ordenar por Activo/Disponible o por varias columnas a la vez.
- Unicidad de nombres de platos.
- Layout específico del formulario para celular más allá de que el diálogo sea desplazable.
- Limpiar del almacenamiento las imágenes de platos eliminados lógicamente.

## Decisiones de clarificación

- **Eliminación**: lógica (`deleted_at`) y permitida para cualquier plato, sin restricciones (decisión del usuario). El plato eliminado desaparece de toda la app; no hay restauración en esta historia.
- **Campos editables** (decisión del usuario): nombre, descripción, imágenes, precio, activo y disponible. Se agregan **categoría** (obligatoria; la historia dice "con foto, precio y categoría") y **stock** (`docs/diagrama-de-base-de-datos.md` ya declara que el administrador lo fija en HU-29, y sin él un plato nuevo quedaría con stock 0 y no se podría pedir).
- **Imágenes como lista editable** (decisión del usuario): se muestran como arreglo ordenado para poder reordenar o quitar solo algunas; la primera es la principal (`position` menor, como en HU-07). Todo se aplica al pulsar "Guardar".
- **Límites de imágenes** (propuesta por defecto): de 1 a 5 por plato, JPEG/PNG/WebP, hasta 5 MB cada una.
- **Pantalla**: mismo patrón que Categorías (HU-31): tabla paginada de 15 en 15 por nombre, buscador, diálogo único para agregar y editar, diálogo de confirmación para eliminar.
- **Búsqueda**: por nombre, sin distinguir mayúsculas ni tildes (reutiliza el criterio de HU-09), a diferencia de la de categorías.
- **Interruptores**: el diálogo usa los interruptores (switch) del design system para Activo y Disponible; los de la tabla, que cambian el estado sin abrir el diálogo, son de HU-30.
- **Activo y Disponible** son independientes (HU-10): inactivo oculta, no disponible marca "Agotado".
- **Categoría de un plato eliminado**: se conserva; una categoría con platos, aunque estén eliminados, no se puede eliminar (decisión del usuario). No hay cambios en `category_id`.

## Preguntas abiertas

Ninguna.
