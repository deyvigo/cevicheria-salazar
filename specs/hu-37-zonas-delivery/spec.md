# Spec: HU-37 — Gestionar las zonas de precio del delivery

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: En implementación

## Objetivo

Que el Administrador defina sobre un mapa las zonas de reparto como polígonos, cada una con su tarifa de delivery, desde la sección **Zonas de delivery** del panel `/admin`, para cobrar el envío según el destino del cliente en lugar de una tarifa fija.

## Contexto (qué ya existe y qué falta)

- HU-24 introdujo el mapa (Leaflet, teselas de OpenStreetMap, punto por defecto en el Centro de Lima) para fijar las coordenadas de una dirección, y dejó explícitamente fuera las zonas y tarifas por zona. HU-14 muestra hoy un delivery de tarifa fija.
- HU-28 creó el panel `/admin` con navegación vertical y la protección por rol `ADMINISTRADOR` en pantallas y API.
- Esta historia **solo gestiona las zonas** (crear, ver, editar, eliminar). Que el carrito y el checkout calculen el delivery a partir de la dirección del cliente y estas zonas es trabajo de otra historia (ver Fuera de alcance).

## Actor(es)

Administrador con sesión iniciada. Visitante y Cliente no tienen acceso (ver Seguridad).

## Criterios de aceptación

### Ver

- **Dado** que estoy en `/admin/zonas-delivery`, **cuando** carga la sección, **entonces** veo a la izquierda un mapa que ocupa la mayor parte del ancho y a la derecha una columna de tarjetas, una por zona, ordenadas por nombre ascendente.
- **Dado** que existen zonas, **cuando** carga el mapa, **entonces** cada zona se dibuja como un polígono con su color (las inactivas con borde punteado y relleno más tenue) y el mapa se encuadra para mostrarlas todas.
- **Dado** que veo una tarjeta, **cuando** la leo, **entonces** muestra el nombre de la zona, una muestra de su color, su tarifa con formato `S/ 8.00`, una etiqueta "Inactiva" si la zona está inactiva y los botones "Editar" y "Eliminar".
- **Dado** que no existen zonas, **cuando** abro la sección, **entonces** veo el mapa centrado en el Centro de Lima y, en la columna, solo el texto "Aún no tienes zonas de delivery"; la única opción de agregar es el botón "Agregar zona" del encabezado.
- **Dado** que la pantalla aún no recibió las zonas, **cuando** la abro, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.
- **Dado** que el mapa no carga (sin conexión o falla del proveedor de mapas), **cuando** abro la sección, **entonces** veo un aviso en lugar del mapa y las tarjetas siguen disponibles; no se puede crear ni redibujar una zona sin mapa (el formulario no permite guardar).

### Interacción mapa y tarjetas

- **Dado** que paso el cursor sobre un polígono, **cuando** lo hago, **entonces** el polígono se resalta y su tarjeta se resalta al mismo tiempo; al salir, ambos vuelven a su aspecto normal.
- **Dado** que paso el cursor sobre una tarjeta, **cuando** lo hago, **entonces** su polígono se resalta en el mapa; al salir, vuelve a su aspecto normal.
- **Dado** que hago clic en una tarjeta, **cuando** lo hago, **entonces** la zona queda seleccionada (tarjeta y polígono con el estilo de seleccionado) y el mapa se centra y se encuadra sobre ese polígono.
- **Dado** que hago clic en un polígono, **cuando** lo hago, **entonces** la zona queda seleccionada y su tarjeta se hace visible en la columna: si no estaba dentro del área visible, la columna se desplaza hasta mostrarla; si ya estaba visible, no se desplaza.
- **Dado** que hay una zona seleccionada, **cuando** selecciono otra, **entonces** la anterior deja de estar seleccionada; solo hay una seleccionada a la vez.
- **Dado** que hay una zona seleccionada, **cuando** hago clic en una parte vacía del mapa (fuera de todo polígono), **entonces** la selección se quita.
- **Dado** que dos polígonos se superponen y hago clic en el área común, **cuando** lo hago, **entonces** se selecciona la zona que se ve encima (ver Casos borde).
- **Dado** que uso el teclado, **cuando** enfoco una tarjeta, **entonces** su polígono se resalta igual que con el cursor, y Enter o Espacio la seleccionan.
- **Dado** que uso un dispositivo táctil sin cursor, **cuando** toco una tarjeta o un polígono, **entonces** funciona como el clic; el resaltado por cursor no aplica.

### Crear

- **Dado** que veo las zonas, **cuando** elijo "Agregar zona", **entonces** las tarjetas de la columna son reemplazadas por un formulario con nombre y tarifa vacíos, un selector de color con uno preseleccionado, un interruptor "Zona activa" encendido, y los botones "Deshacer", "Reiniciar", "Cancelar" y "Guardar"; el botón "Agregar zona" del encabezado queda deshabilitado y se quita la selección y el resaltado.
- **Dado** que estoy creando una zona, **cuando** toco puntos del mapa principal, **entonces** se añaden vértices y se va formando el polígono; puedo mover un vértice arrastrándolo, quitarlo tocándolo (quedando al menos 3), añadir uno tocando el punto medio de un lado, deshacer el último vértice y reiniciar el dibujo.
- **Dado** que completo nombre, tarifa, color, estado y un polígono válido (al menos 3 vértices, sin cruzarse a sí mismo), **cuando** guardo, **entonces** la zona se crea, el formulario se cierra y vuelven las tarjetas, aparece su polígono y su tarjeta, queda seleccionada y veo la notificación "Zona agregada".
- **Dado** que elijo un color en el selector, **cuando** lo hago, **entonces** el polígono que estoy dibujando en el mapa cambia a ese color de inmediato.
- **Dado** que estoy creando o editando una zona, **cuando** paso el cursor o hago clic sobre las demás zonas del mapa, **entonces** no pasa nada (se ven atenuadas, sin resaltado ni selección) y el clic añade un punto al dibujo; vuelven a ser interactivas al guardar o cancelar.
- **Dado** que dejo vacío el nombre, la tarifa o el polígono, **cuando** intento guardar, **entonces** veo qué falta y no se envía la solicitud.
- **Dado** que el nombre excede el largo máximo, la tarifa no es un monto válido (por ejemplo, 0 o negativa) o el polígono es inválido, **cuando** intento guardar, **entonces** veo el motivo y no se envía la solicitud.
- **Dado** que el nombre ya existe (sin distinguir mayúsculas), **cuando** guardo, **entonces** el formulario sigue abierto con mis datos y un mensaje en el campo ("Ya existe una zona con ese nombre").
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** guardo, **entonces** el formulario sigue abierto con mis datos y el polígono dibujado, y el mensaje "No pudimos guardar la zona, intenta de nuevo".
- **Dado** que elijo "Cancelar" sin guardar, **cuando** el formulario se cierra, **entonces** el dibujo se descarta, vuelven las tarjetas y al abrirlo de nuevo está vacío.

### Editar

- **Dado** que veo una zona, **cuando** elijo "Editar" en su tarjeta, **entonces** la zona queda seleccionada, el mapa se encuadra sobre ella, las tarjetas son reemplazadas por el mismo formulario con su nombre, tarifa, color y estado cargados, y su polígono queda en el mapa principal en modo de edición (vértices que puedo arrastrar, añadir y quitar, mínimo 3).
- **Dado** que modifico nombre, tarifa, color, estado y/o polígono con valores válidos, **cuando** guardo, **entonces** los cambios se guardan, el formulario se cierra, el mapa y la tarjeta muestran los valores nuevos y veo la notificación "Zona actualizada".
- **Dado** que abro el formulario y no cambié nada, **cuando** miro "Guardar", **entonces** está deshabilitado.
- **Dado** que cambié campos, el color o el polígono, **cuando** elijo "Cancelar", **entonces** no se guarda nada y la zona sigue como estaba guardada.
- **Dado** que el nombre nuevo pertenece a **otra** zona, **cuando** guardo, **entonces** se rechaza con el mismo mensaje de la creación; conservar mi propio nombre no cuenta como repetido.
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** guardo, **entonces** el formulario sigue abierto con mis ediciones y el mensaje "No pudimos guardar la zona, intenta de nuevo".

### Activar y desactivar

- **Dado** que edito una zona, **cuando** apago el interruptor "Zona activa" y guardo, **entonces** la zona queda inactiva: su tarjeta muestra la etiqueta "Inactiva", su polígono se dibuja con borde punteado y relleno tenue, y veo la notificación "Zona actualizada".
- **Dado** que una zona está inactiva, **cuando** enciendo el interruptor y guardo, **entonces** vuelve a estar activa y pierde la etiqueta y el estilo tenue.
- **Dado** que una zona está inactiva, **cuando** paso el cursor, la selecciono, la edito o la elimino, **entonces** se comporta igual que una activa; solo cambia su aspecto.
- **Dado** que una zona está inactiva, **cuando** la historia del cálculo del delivery consulte las zonas, **entonces** deberá ignorarla: una zona inactiva conserva su dibujo y tarifa pero no se cobra (esa consulta no se construye aquí).

### Eliminar

- **Dado** que veo una zona, **cuando** elijo "Eliminar" en su tarjeta, **entonces** se abre un diálogo de confirmación que muestra su nombre, con "Eliminar" y "Cancelar".
- **Dado** que confirmo, **cuando** el servidor responde, **entonces** el polígono desaparece del mapa, la tarjeta de la columna, el diálogo se cierra, la selección se quita si era esa zona y veo la notificación "Zona eliminada".
- **Dado** que cancelo la confirmación (Cancelar, Escape o tocar fuera), **cuando** el diálogo se cierra, **entonces** la zona sigue en el mapa y en la lista.
- **Dado** que el servidor rechaza por otro motivo o no responde, **cuando** confirmo, **entonces** el diálogo sigue abierto con el mensaje "No pudimos eliminar la zona, intenta de nuevo" y la zona sigue en la lista.

### Seguridad

- **Dado** que no soy Administrador, **cuando** llamo a los endpoints de gestión de zonas, **entonces** la API responde "no autenticado" (sin sesión) o "prohibido" (Cliente) y no devuelve ni modifica datos.
- **Dado** que intento editar o eliminar una zona que no existe (por ejemplo, ya eliminada desde otra pestaña), **cuando** el servidor la recibe, **entonces** responde 404.
- **Dado** que envío a la API un polígono inválido o una tarifa inválida, **cuando** el servidor la recibe, **entonces** responde 400 y no guarda nada; las reglas se validan en el servidor, no solo en la pantalla.

## Casos borde

- Espacios al inicio o al final del nombre se ignoran. El nombre admite hasta 60 caracteres; la unicidad no distingue mayúsculas.
- Tarifa: monto en soles con hasta 2 decimales, **estrictamente mayor que 0** (mínimo S/ 0.01; no hay zonas gratis) y con un máximo de S/ 99.99.
- Estado: toda zona es activa o inactiva (nueva = activa); se cambia solo desde el formulario de edición.
- Color: se elige de una paleta fija de colores del design system; todas las zonas tienen uno y varias zonas pueden compartirlo. Se guarda como un identificador de la paleta, no como un valor libre.
- Polígono válido: de 3 a 100 vértices, coordenadas dentro de rangos geográficos válidos, anillo cerrado automáticamente (el último vértice no se repite), sin aristas que se crucen entre sí y con área distinta de cero. Un polígono con un único anillo, sin huecos.
- **Zonas superpuestas**: se permiten, sin bloquear el guardado ni mostrar aviso. Para decidir qué zona se ve encima y cuál se selecciona al hacer clic en el área común, la zona más pequeña va por encima de la más grande, de modo que ninguna zona queda inaccesible. Qué tarifa aplica a una dirección dentro de una superposición lo decide la historia del cálculo del delivery.
- **Zonas pequeñas o anidadas**: una zona totalmente contenida en otra sigue siendo seleccionable por el mismo criterio de tamaño.
- Las zonas no se validan contra Lima ni contra la ubicación del negocio: son lo que el Administrador dibujó.
- Una zona con un polígono muy grande o lejos del encuadre actual sigue siendo seleccionable desde su tarjeta, que centra y encuadra el mapa sobre ella.
- Seleccionar desde el mapa una zona cuya tarjeta está fuera del área visible desplaza la columna; el desplazamiento debe ser suave y no mover el resto de la página.
- Con muchas zonas la columna de tarjetas se desplaza por sí sola; el mapa permanece a la vista y no se desplaza con ella.
- En pantallas angostas (celular) el mapa y la columna se apilan: el mapa arriba y las tarjetas debajo; las interacciones táctiles equivalentes a las de cursor son las del clic.
- Dos administradores (o dos pestañas) editando la misma zona: gana el último guardado; si una pestaña la eliminó, la otra recibe 404 al guardar y ve el mensaje de error genérico.
- La sesión vence con el formulario abierto: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión y se pierden las ediciones no guardadas.
- Eliminar una zona no afecta pedidos ya hechos: los pedidos conservarán el costo de delivery con el que se cobraron (lo garantiza la historia del pedido, no esta).

## Fuera de alcance

- Calcular el costo de delivery del carrito o del checkout a partir de la dirección del cliente y las zonas (reemplazo de la tarifa fija de HU-14) y avisar al cliente si su dirección queda fuera de toda zona. Es una historia aparte que consumirá estas zonas.
- Resolver superposiciones de tarifa (cuál aplica, la menor o la mayor) y detectar o impedir superposiciones al guardar.
- Horarios o tarifas distintas por hora, pedido mínimo o tiempo estimado por zona.
- Activar o desactivar desde la tarjeta con un clic (solo desde el formulario de edición).
- Importar o exportar polígonos (GeoJSON, KML), dibujar círculos o rectángulos, o polígonos con huecos o varias partes.
- Buscar una dirección en el mapa, geolocalización del dispositivo, o mostrar las zonas al cliente en la tienda.
- Eliminación lógica o restauración de zonas eliminadas.
- Colores libres (selector de cualquier color) o colores por zona fuera de la paleta fija.
- Tarifa 0 / delivery gratis.
- Búsqueda y paginación de zonas: se espera un número pequeño; la columna se desplaza.

## Decisiones de clarificación

- **Ubicación**: nueva sección **Zonas de delivery** en la navegación vertical del panel, ruta `/admin/zonas-delivery`.
- **Disposición**: mapa a la izquierda (mayor espacio) y columna de tarjetas a la derecha; en pantallas angostas se apilan.
- **Campos**: `name` (obligatorio, único sin distinguir mayúsculas), `price` (tarifa, obligatoria, mayor que 0), `area` (polígono, obligatorio), `active` (por defecto activa) y `color` (obligatorio, de una paleta fija).
- **Sin tope de zonas**: el panel está pensado para pocas, pero no se impone un máximo.
- **Superposición**: permitida; la zona más pequeña se ve y se selecciona por encima.
- **Formulario**: reemplaza a las tarjetas en la columna derecha (no es un diálogo); el polígono se dibuja y edita en el mapa principal y las demás zonas quedan atenuadas y sin interacción hasta guardar o cancelar. Solo la confirmación de eliminar es un diálogo.
- **Interacción**: el resaltado por cursor es bidireccional (polígono y tarjeta); clic en tarjeta selecciona y encuadra el polígono; clic en polígono selecciona y desplaza la columna solo si la tarjeta no está visible.
- **Edición del polígono**: se dibuja y modifica con vértices sobre el mapa principal.
- **Eliminar**: definitivo (borrado físico), sin papelera.

## Preguntas abiertas

Ninguna.
