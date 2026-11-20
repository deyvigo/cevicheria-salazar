# Spec: HU-41 — Reseñas de platos

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: Hecha

## Objetivo

Que un Cliente pueda dejar una reseña (calificación de 1 a 5 y, opcionalmente, un comentario de texto) sobre un plato que ya compró, y que cualquier Visitante o Cliente pueda leer las reseñas al final del detalle del plato (HU-08) para decidir si lo pide.

## Contexto (qué ya existe y qué falta)

`products.rating` ya existe (promedio de 0.0 a 5.0, `NULL` si no tiene) y el catálogo y el detalle ya lo muestran, pero hoy no hay de dónde salga: HU-08 lo dejó fuera de alcance ("no hay reseñas en el backlog"). Esta historia crea las reseñas y hace que `rating` sea el promedio de ellas. Los pedidos (`orders`, `order_items`) y su `delivery_status` vienen de HU-19, HU-25 y HU-26.

## Actor(es)

- **Cliente**: escribe, edita y elimina su reseña de un plato que compró.
- **Visitante**: solo lee las reseñas (el detalle es público).

## Pantalla

En `/products/{id}`, debajo de la información del plato, una sección "Reseñas":

- Resumen: promedio con estrellas y total de reseñas.
- Botón "Escribir reseña" junto al título, solo para el Cliente con derecho a reseñar. Abre un diálogo con el selector de 1 a 5 estrellas y el campo de comentario; el formulario nunca aparece directo en la página. Si ya reseñó, el botón no se muestra y en su lugar aparece su reseña con las acciones Editar (abre el mismo diálogo) y Eliminar.
- Filtros bajo el título: "Todas" (por defecto), "Positivas" (4 y 5 estrellas), "Neutras" (3) y "Negativas" (1 y 2). El resumen (promedio y total) no cambia con el filtro.
- Lista de reseñas: nombre del autor (nombre de pila, sin apellido completo ni correo), estrellas, comentario (si lo dejó) y fecha, de la más reciente a la más antigua. Carga de 10 en 10 con scroll: al llegar al final de la lista se piden las siguientes, sin botones de página.

Se replican los componentes `Card`, `Input` y `Button` del `design-system/`, y la confirmación de eliminar usa `Dialog`.

## Criterios de aceptación

- **Dado** que soy un Cliente con sesión iniciada y compré el plato, **cuando** abro su detalle, **entonces** veo el botón "Escribir reseña"; **y cuando** lo pulso, **entonces** se abre un diálogo con las estrellas y el comentario, y al publicar o cancelar se cierra.
- **Dado** que soy un Cliente que no compró el plato, **cuando** abro su detalle, **entonces** veo las reseñas pero ni el botón ni ningún aviso sobre por qué no puedo reseñar.
- **Dado** que soy un Visitante sin sesión, **cuando** abro el detalle, **entonces** veo las reseñas y un enlace "Inicia sesión para dejar tu reseña".
- **Dado** que elijo una calificación de 1 a 5 (con o sin comentario), **cuando** envío, **entonces** mi reseña aparece en la lista, el resumen y el `rating` del plato se actualizan.
- **Dado** que envío sin calificación, **cuando** valido, **entonces** veo un error junto a las estrellas y no se guarda nada. El comentario es opcional: vacío o solo espacios se guarda como sin comentario.
- **Dado** que escribo un comentario de más de 500 caracteres, **cuando** valido, **entonces** veo un error junto al campo (con contador) y no se guarda.
- **Dado** que ya reseñé un plato, **cuando** vuelvo a su detalle, **entonces** no puedo crear otra reseña: veo la mía con Editar y Eliminar (una reseña por cliente y plato).
- **Dado** que edito mi reseña, **cuando** guardo, **entonces** se actualizan calificación, comentario, promedio y se muestra "editado".
- **Dado** que elimino mi reseña y confirmo, **cuando** termina, **entonces** desaparece de la lista, el promedio se recalcula y, si era la única, el plato vuelve a no tener calificación (`NULL`).
- **Dado** que elijo un filtro (Positivas, Neutras o Negativas), **cuando** se aplica, **entonces** la lista muestra solo las reseñas de ese rango de estrellas, empieza de nuevo desde la más reciente y mantiene el scroll infinito; si no hay ninguna, veo "No hay reseñas de este tipo.". Con "Todas" vuelvo a verlas todas.
- **Dado** que el plato tiene calificación, **cuando** abro el detalle, **entonces** bajo su nombre veo cinco estrellas pintadas en proporción al promedio (4.3 pinta cuatro y el 30% de la quinta) junto al número.
- **Dado** que el plato no tiene reseñas, **cuando** abro el detalle, **entonces** veo "Aún no hay reseñas" (y el formulario si tengo derecho).
- **Dado** que intento crear, editar o eliminar una reseña ajena o de un plato no comprado llamando a la API directamente, **cuando** el servidor valida, **entonces** rechaza la operación (403) sin modificar datos.
- **Dado** que el plato tiene más de 10 reseñas, **cuando** hago scroll hasta el final de la lista, **entonces** se cargan las siguientes 10 (con un indicador de carga) hasta que no queden más; si falla la carga, veo "No pudimos cargar más reseñas" con "Reintentar".
- **Dado** que no he iniciado sesión, **cuando** consulto las reseñas de un plato, **entonces** el endpoint de lectura responde igual (público).

## Casos borde

- **Qué cuenta como "compré"**: el plato aparece en un pedido del Cliente con `delivery_status = ENTREGADO`. Un pedido pendiente, en curso, cancelado, rechazado o fallido no da derecho: una reseña sin compra concretada no sería real. Si el derecho existía y luego deja de existir no hay caso (`ENTREGADO` es final).
- **Plato comprado y luego desactivado**: el Cliente conserva su reseña y puede editarla/eliminarla desde el perfil, pero el detalle del plato inactivo sigue dando "No encontramos este plato" (regla de HU-08).
- **Recálculo del promedio**: se hace en la misma transacción que crea, edita o elimina la reseña; un decimal, redondeo estándar. Dos reseñas simultáneas no deben dejar un promedio desactualizado.
- **Scroll y reseñas nuevas**: si otra reseña se publica mientras se hace scroll, la siguiente página puede repetir una reseña ya mostrada; el cliente descarta duplicados por `id`.
- **Un solo plato en varios pedidos**: da derecho a una única reseña, no a una por pedido.
- **Doble envío**: la restricción de una reseña por (cliente, plato) en base de datos evita duplicados aunque se haga doble clic o dos pestañas.
- **Texto**: máximo 500 caracteres (opcional), se guarda y muestra como texto plano (sin interpretar HTML) y con saltos de línea conservados.
- **Cuenta eliminada o nombre sin datos**: la reseña se muestra con "Cliente" como autor.
- **Sesión expirada** al enviar: se pide iniciar sesión de nuevo sin perder el texto escrito.

## Fuera de alcance

- Moderación de reseñas por el administrador (ocultar/eliminar reseñas ajenas): historia futura en E6.
- Respuestas del negocio a una reseña, "me resulta útil", reportar reseñas.
- Fotos en las reseñas.
- Reseñar el pedido o el servicio de delivery (solo platos).
- Paginación con botones de página; ordenar reseñas por calificación o por fecha; mostrar la distribución por estrellas.
- Notificar por correo que se puede reseñar.
- Pantalla "Mis reseñas" en el perfil.
- Layout para celular (iteración posterior, como HU-07 y HU-08).

## Decisiones de clarificación

- **Compra**: solo pedidos `ENTREGADO`.
- **Editar y eliminar**: el autor puede editar y eliminar su propia reseña.
- **Calificación y comentario**: calificación entera de 1 a 5, obligatoria; comentario opcional de hasta 500 caracteres.
- **Lista**: scroll infinito de 10 en 10, de la más reciente a la más antigua.
- **Autor**: primer nombre del Cliente.
