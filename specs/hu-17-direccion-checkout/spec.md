# Spec: HU-17 — Seleccionar la dirección de entrega en el checkout

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada elija en el checkout cómo recibe su pedido, con **Entrega** a una de sus direcciones guardadas (o una nueva) o **Recojo en tienda**, y vea el costo de delivery que le corresponde según la zona de esa dirección.

## Contexto (qué ya existe y qué falta)

- HU-24 permite guardar hasta 10 direcciones con coordenadas fijadas en un mapa, y tiene el diálogo de agregar dirección (`address-dialog`).
- HU-37 permite al administrador dibujar zonas de delivery (polígonos con tarifa) y dejó fuera calcular el delivery del cliente y avisar si su dirección queda fuera de toda zona: esta historia lo hace.
- HU-38 muestra el indicador de pasos con **Entrega** como tercer paso (segundo con sesión). HU-14 muestra un resumen del pedido sin delivery en `/cart`; el botón "Continuar" lleva al visitante a iniciar sesión y al cliente a este paso.
- El pago (HU-18 a HU-20) y la confirmación (HU-21) son pasos posteriores.

## Actor(es)

Cliente con sesión iniciada. El flujo de compra es secuencial (Carrito, Inicio de sesión, Entrega, Pago, ¡Listo!): a este paso solo se llega desde "Continuar" en `/cart`.

## Pantalla del paso Entrega

Ruta `/checkout/direcciones`. Muestra el indicador de pasos con **Entrega** resaltado, el selector de tipo de entrega y el resumen del pedido con el costo de delivery.

### Tipo de entrega

Dos opciones excluyentes: **Entrega** y **Recojo en tienda**.

- **Entrega**: debajo se listan las direcciones guardadas del cliente, una por tarjeta seleccionable (nombre, dirección y referencia), y al final una opción **Agregar nueva dirección**.
- **Recojo en tienda**: no muestra nada más.

### Costo de delivery

- Al seleccionar una dirección, el frontend pide al backend el costo de delivery para esa dirección. El cálculo lo hace el backend con las coordenadas guardadas de la dirección y las zonas **activas** (HU-37); el cliente no envía ni conoce las tarifas.
- Si la dirección cae dentro de una zona, se muestra "Delivery" con la tarifa de la zona (`S/ 8.00`) y el total se recalcula.
- Si no cae en ninguna zona, se informa que la dirección **no está en cobertura**, el delivery se muestra como `S/ 0.00` y no se puede continuar con esa dirección: el cliente debe elegir otra o cambiar a Recojo en tienda.
- Con Recojo en tienda el delivery es `S/ 0.00` y no hay mensaje de cobertura.

## Criterios de aceptación

### Acceso y estructura

- **Dado** cualquier persona (visitante o cliente), **cuando** abre `/checkout/direcciones` escribiendo la URL, desde un marcador o recargando la página, **entonces** es llevada a `/cart`; no se puede entrar al paso sin haber pasado por "Continuar" en el paso anterior.
- **Dado** un visitante en `/cart`, **cuando** elige "Continuar", **entonces** va a iniciar sesión y, al lograrlo, llega directo a este paso, sin volver a `/cart` ni elegir "Continuar" otra vez.
- **Dado** que la compra empezó sin sesión, **cuando** llego a este paso tras iniciar sesión, **entonces** el indicador mantiene los cinco pasos, con "Entrega" como tercero resaltado; si ya tenía sesión al empezar, muestra cuatro, con "Entrega" como segundo.
- **Dado** un cliente con platos en el carrito, **cuando** llega desde "Continuar" en `/cart`, **entonces** ve el indicador con "Entrega" resaltado y el tipo de entrega **Entrega** preseleccionado.
- **Dado** un cliente que llegó desde `/cart`, **cuando** quita todos los platos del carrito y vuelve a esta pantalla con "atrás" del navegador, **entonces** es llevado a `/cart`.

### Entrega

- **Dado** que elijo Entrega y tengo direcciones guardadas, **cuando** se carga la lista, **entonces** veo una tarjeta por dirección (más reciente primero, como en HU-24) y al final la opción "Agregar nueva dirección".
- **Dado** que elijo Entrega y no tengo direcciones, **cuando** se carga la lista, **entonces** veo solo la opción "Agregar nueva dirección".
- **Dado** que la lista aún carga o falló, **cuando** la miro, **entonces** veo un estado de carga, o un mensaje con opción de reintentar.
- **Dado** que veo mis direcciones, **cuando** elijo una, **entonces** queda seleccionada (solo una a la vez) y se calcula su delivery.
- **Dado** que elijo "Agregar nueva dirección", **cuando** lo hago, **entonces** se abre el diálogo de agregar dirección de HU-24 (nombre, dirección, referencia y mapa).
- **Dado** que guardé una nueva dirección desde el diálogo, **cuando** se cierra, **entonces** aparece en la lista, queda seleccionada y se calcula su delivery.
- **Dado** que cancelo el diálogo, **cuando** se cierra, **entonces** la selección no cambia.
- **Dado** que ya tengo 10 direcciones, **cuando** elijo "Agregar nueva dirección", **entonces** se informa el límite igual que en HU-24 y no se crea otra.

### Recojo en tienda

- **Dado** que elijo Recojo en tienda, **cuando** cambio de opción, **entonces** desaparecen la lista y "Agregar nueva dirección", el delivery es `S/ 0.00` y puedo continuar sin dirección.
- **Dado** que volví de Recojo en tienda a Entrega, **cuando** se muestra la lista, **entonces** se conserva la dirección que tenía seleccionada.

### Costo y cobertura

- **Dado** que selecciono una dirección dentro de una zona activa, **cuando** el backend responde, **entonces** el resumen muestra el delivery con la tarifa de esa zona y el total incluye ese monto.
- **Dado** que selecciono una dirección fuera de toda zona activa, **cuando** el backend responde, **entonces** veo el aviso de que no está en cobertura, el delivery `S/ 0.00` y que debo elegir otra dirección o recoger en tienda.
- **Dado** una dirección sin cobertura seleccionada, **cuando** miro "Continuar", **entonces** está deshabilitado.
- **Dado** que cambio de una dirección a otra, **cuando** se recalcula, **entonces** el delivery y el total no muestran el valor anterior mientras llega la respuesta (estado de carga) y "Continuar" queda deshabilitado hasta tenerla.
- **Dado** que falla el cálculo del delivery, **cuando** ocurre, **entonces** veo un mensaje con opción de reintentar y no puedo continuar.
- **Dado** que el administrador cambió o desactivó una zona, **cuando** vuelvo a seleccionar la dirección, **entonces** se usa la tarifa vigente.

### Continuar

- **Dado** cualquier selección, **cuando** miro "Continuar", **entonces** está deshabilitado: el paso de pago (HU-18) aún no existe y esta historia no navega hacia él.
- **Dado** que quiero volver, **cuando** elijo "Volver al carrito", **entonces** regreso a `/cart` sin perder el carrito.

## Casos borde

- **Dirección eliminada** en el perfil mientras estaba seleccionada: deja de aparecer y la selección se limpia.
- **Zonas superpuestas**: se aplica la tarifa menor (ver Decisiones de clarificación).
- **Sin zonas activas**: toda dirección queda sin cobertura; Recojo en tienda sigue disponible.
- **Dirección en el borde de una zona**: cuenta como dentro si el punto toca el polígono.
- **Tarifa manipulada**: el cliente no envía el costo; el backend lo vuelve a calcular al crear el pedido (HU-21) y no confía en el valor mostrado.
- **Mapa que no carga** al agregar una dirección: se comporta como en HU-24.
- **Inicio de sesión con Google**: el viaje a Google sale de la aplicación y pierde el estado del checkout; al volver, el cliente cae en `/cart` y elige "Continuar" de nuevo (con sesión, así que ve cuatro pasos).
- **Sesión que expira** con la pantalla abierta: se lleva al cliente a `/cart`, desde donde repite el flujo.
- **Recarga de la pantalla**: lleva a `/cart` y se pierde la selección.

## Fuera de alcance

- Pago (HU-18 a HU-20), creación del pedido y confirmación (HU-21, HU-22), y la navegación del botón "Continuar" hacia el pago: queda deshabilitado hasta que exista HU-18.
- Editar o eliminar direcciones desde el checkout (se hace en el perfil, HU-24).
- Tiempo estimado de entrega, dirección y horario de la tienda para el recojo, o elegir sucursal.
- Detectar la ubicación del dispositivo o buscar direcciones por texto.
- Layout para celular, igual que HU-07, HU-08, HU-13, HU-14 y HU-38.

## Impacto en documentación

- `docs/historias.md` y `docs/cronograma.md`: estado de HU-17.
- `docs/diagrama-de-arquitectura.md`: el servicio de checkout calcula el delivery con PostGIS.
- `docs/diagrama-de-base-de-datos.md`: ninguno si el cálculo no guarda datos (los pedidos llegarán con HU-21).
- `frontend/src/features/checkout/README.md` y `frontend/src/features/carrito/README.md`: pantalla y ruta nueva.

## Decisiones de clarificación

- **Botón "Continuar" deshabilitado**: HU-18 no tiene pantalla todavía; la navegación al pago se conecta en esa historia.
- **Flujo estrictamente secuencial**: ninguna ruta del checkout se abre directamente; cualquier acceso directo, marcador o recarga redirige a `/cart`, y el avance es solo del paso 1 hacia los mayores.
- **Zonas superpuestas**: si una dirección cae en varias zonas activas, se aplica la tarifa **menor**, para no cobrar de más al cliente.
- **Dónde se guarda la elección** (tipo de entrega y dirección): en el estado de la aplicación del checkout, no en `localStorage`. Se pierde al recargar, y entonces la pantalla redirige a `/cart` y vuelve a preseleccionar Entrega.

## Preguntas abiertas

Ninguna.
