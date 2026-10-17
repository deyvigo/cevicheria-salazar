# Spec: HU-24 — Ver, crear, editar y eliminar mis direcciones de entrega

**Épica**: [E5. Perfil del cliente](../../docs/epicas.md#e5)
**Estado**: En implementación

## Objetivo

Que un Cliente con sesión iniciada guarde varias direcciones de entrega en su perfil y las gestione (ver, crear, editar y eliminar), para no escribirlas en cada pedido.

## Contexto (qué ya existe y qué falta)

El perfil (HU-23) tiene navegación vertical con una sola pestaña, **Mi información**, pensada para que HU-24 agregue la suya. Hoy no existe ningún modelo de direcciones ni mapas en la app: el checkout (HU-17, Sprint 3) las consumirá para elegir dónde entregar, pero esta historia solo cubre su gestión desde el perfil.

El borrado es **lógico (soft delete)**: la dirección eliminada deja de aparecer para el cliente, pero la fila se conserva para que los pedidos ya hechos (E4) sigan pudiendo referenciar la dirección a la que se entregaron.

## Actor(es)

Cliente con sesión iniciada. Los administradores no usan `/perfil` (ver HU-23), así que no gestionan direcciones.

## Criterios de aceptación

### Navegación

- **Dado** que estoy en el perfil, **cuando** miro la navegación vertical, **entonces** veo la pestaña "Mis direcciones" después de "Mi información", con su propia URL (`/perfil/mis-direcciones`); recargar la página conserva la pestaña.
- **Dado** que no tengo sesión, **cuando** abro `/perfil/mis-direcciones`, **entonces** soy llevado a iniciar sesión y, al lograrlo, vuelvo a esa pestaña.

### Ver

- **Dado** que tengo direcciones guardadas, **cuando** entro a "Mis direcciones", **entonces** veo una tarjeta por dirección con su nombre, la dirección, la referencia (si la tiene) y las acciones "Editar" y "Eliminar", ordenadas de la más reciente a la más antigua.
- **Dado** que no tengo direcciones, **cuando** entro a "Mis direcciones", **entonces** veo un estado vacío ("Aún no tienes direcciones guardadas") con la opción de agregar una.
- **Dado** que la pantalla aún no recibió mis direcciones, **cuando** la abro, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.
- **Dado** que eliminé una dirección, **cuando** veo mi lista, **entonces** ya no aparece.

### Crear

- **Dado** que veo mis direcciones, **cuando** elijo "Agregar dirección", **entonces** se abre un diálogo con un formulario vacío con nombre de la dirección (por ejemplo "Casa" o "Trabajo"), dirección, referencia (opcional) y un mapa para fijar las coordenadas.
- **Dado** que se abre el diálogo para agregar, **cuando** se muestra el mapa, **entonces** hay un marcador ubicado en el Centro de Lima (Plaza Mayor, latitud -12.0464 y longitud -77.0428) que puedo mover arrastrándolo, o tocando un punto del mapa.
- **Dado** que muevo el marcador, **cuando** guardo, **entonces** se guardan las coordenadas de la posición final del marcador; si no lo muevo, se guardan las del Centro de Lima.
- **Dado** que completo los campos obligatorios con valores válidos, **cuando** guardo, **entonces** la dirección se guarda, el diálogo se cierra, aparece en la lista y veo la notificación "Dirección agregada".
- **Dado** que dejo vacío el nombre o la dirección, **cuando** intento guardar, **entonces** veo qué campo falta y no se envía la solicitud.
- **Dado** que escribo valores que exceden el largo máximo de un campo, **cuando** intento guardar, **entonces** veo el límite y no se envía la solicitud.
- **Dado** que el servidor rechaza o no responde al guardar, **cuando** envío el formulario, **entonces** el diálogo sigue abierto con mis datos y el mensaje "No pudimos guardar la dirección, intenta de nuevo".
- **Dado** que cierro el diálogo (Cancelar, Escape o tocar fuera) sin guardar, **cuando** lo reabro, **entonces** el formulario está vacío.

### Editar

- **Dado** que veo una dirección, **cuando** elijo "Editar", **entonces** se abre el mismo diálogo con sus valores cargados y el mapa con el marcador en las coordenadas guardadas de esa dirección, que puedo mover.
- **Dado** que modifico los campos con valores válidos, **cuando** guardo, **entonces** los cambios se guardan, el diálogo se cierra, la lista muestra los valores nuevos y veo la notificación "Dirección actualizada".
- **Dado** que abro el diálogo y no cambié nada (ni campos ni la posición del marcador), **cuando** miro "Guardar", **entonces** está deshabilitado.
- **Dado** que cambié campos, **cuando** cierro el diálogo (Cancelar, Escape o tocar fuera), **entonces** no se guarda nada y al reabrirlo veo los valores guardados.
- **Dado** que el servidor rechaza o no responde al guardar, **cuando** envío el formulario, **entonces** el diálogo sigue abierto con mis ediciones y el mismo mensaje de error de creación.

### Eliminar (soft delete)

- **Dado** que veo una dirección, **cuando** elijo "Eliminar", **entonces** se abre un diálogo de confirmación que muestra el nombre y la dirección, con "Eliminar" y "Cancelar".
- **Dado** que confirmo, **cuando** el servidor responde, **entonces** la dirección desaparece de la lista, el diálogo se cierra y veo la notificación "Dirección eliminada".
- **Dado** que confirmo la eliminación, **cuando** se procesa, **entonces** la fila no se borra de la base de datos: se marca con la fecha de eliminación y deja de ser visible, editable y eliminable desde la API para el cliente.
- **Dado** que cancelo la confirmación (Cancelar, Escape o tocar fuera), **cuando** el diálogo se cierra, **entonces** la dirección sigue en la lista.
- **Dado** que el servidor rechaza o no responde al eliminar, **cuando** confirmo, **entonces** el diálogo sigue abierto con el mensaje "No pudimos eliminar la dirección, intenta de nuevo" y la dirección sigue en la lista.
- **Dado** que existen pedidos hechos con una dirección que luego eliminé, **cuando** se consulta ese pedido, **entonces** conserva los datos de la dirección con la que se hizo (ver Casos borde).

### Seguridad

- **Dado** que intento ver, editar o eliminar una dirección de otro cliente (por ejemplo cambiando el id en la solicitud), **cuando** el servidor la recibe, **entonces** responde como si no existiera (404) y no revela ni modifica nada.
- **Dado** que intento editar o eliminar una dirección ya eliminada, **cuando** el servidor la recibe, **entonces** responde 404.

## Casos borde

- Espacios al inicio o al final de nombre, dirección y referencia se ignoran; una referencia que queda vacía se guarda como ausente.
- Dos direcciones con el mismo nombre están permitidas: el nombre es solo para reconocerlas.
- Las coordenadas son siempre obligatorias y válidas (latitud entre -90 y 90, longitud entre -180 y 180); el servidor rechaza solicitudes sin ellas o fuera de rango. Como el marcador siempre parte de un punto por defecto, el cliente nunca queda sin coordenadas.
- Las coordenadas no se validan contra la dirección escrita ni contra Lima: son lo que el cliente fijó en el mapa.
- Si el mapa no carga (sin conexión o falla del proveedor de mapas), el diálogo muestra un aviso en lugar del mapa y no permite guardar, porque no habría forma de fijar las coordenadas.
- Dos pestañas del navegador abiertas: si elimino una dirección en una, y luego intento editarla en la otra, el guardado falla con el mensaje de error genérico y la lista se refresca al reintentar; gana el último guardado.
- La sesión vence mientras tengo un diálogo abierto: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión y se pierden las ediciones no guardadas.
- Una dirección eliminada o editada no altera pedidos ya hechos: el pedido conservará una copia de los datos de entrega (se decide en E4).
- Límite de direcciones por cliente: ver Preguntas abiertas.

## Fuera de alcance

- Seleccionar una dirección durante el checkout o ingresar una nueva ahí (HU-17).
- Marcar una dirección como predeterminada.
- Buscar una dirección escrita en el mapa, autocompletado, "usar mi ubicación" (geolocalización del dispositivo) o validar la dirección con un servicio externo.
- Mostrar el mapa en la lista de direcciones: solo aparece en los diálogos de agregar y editar.
- Zonas de delivery y tarifas por zona (ver HU-14: tarifa fija).
- Restaurar direcciones eliminadas, o ver y purgar las eliminadas.
- Direcciones del Administrador.

## Decisiones de clarificación

- **Campos**: `label` (nombre de la dirección, obligatorio, hasta 40 caracteres), `address` (calle y número, obligatoria, hasta 200), `reference` (opcional, hasta 200) y coordenadas (`latitude`, `longitude`, obligatorias). Sin distrito/ciudad separados: el delivery tiene tarifa fija y no hay zonas.
- **Mapa**: el diálogo de agregar y editar incluye un mapa con un marcador movible; el punto por defecto es el Centro de Lima (-12.0464, -77.0428). La elección del proveedor de mapas se define en el plan.
- **Máximo por cliente**: 10 direcciones activas (las eliminadas no cuentan); al llegar al tope, "Agregar dirección" se deshabilita con un aviso y el servidor rechaza con 409.
- **Teléfono**: no se pide por dirección; se usa el del perfil (HU-23).
- **Dirección predeterminada**: no existe en esta historia; el checkout (HU-17) preseleccionará la más reciente.
