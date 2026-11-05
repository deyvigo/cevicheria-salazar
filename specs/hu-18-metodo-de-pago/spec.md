# Spec: HU-18 — Elegir el método de pago en el checkout

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada elija en el paso **Pago** cómo pagará su pedido: **Pago en línea** (pasarela Mercado Pago) o **Contraentrega**, viendo el resumen final con el total a pagar.

## Contexto (qué ya existe y qué falta)

- HU-17 entrega el paso Entrega en `/checkout/direcciones` con el tipo de entrega, la dirección y el costo de delivery guardados en el estado del checkout. Su botón "Continuar" quedó deshabilitado esperando esta historia.
- HU-38 ya incluye **Pago** en el indicador de pasos (tercero con sesión, cuarto sin ella al empezar).
- Esta historia solo cubre **la elección**. El cobro con la pasarela (HU-19), el detalle de contraentrega (HU-20), la creación del pedido y la confirmación (HU-21) y el rechazo del pago (HU-22) son historias posteriores.
- La pasarela es **Mercado Pago**, no Izipay como figura hoy en `docs/`; el cambio se documenta en HU-19.

## Actor(es)

Cliente con sesión iniciada. El flujo es secuencial: a este paso solo se llega con "Continuar" desde el paso Entrega.

## Pantalla del paso Pago

Ruta `/checkout/pago`. Muestra el indicador de pasos con **Pago** resaltado, solo el selector de método de pago (sin dirección ni otros datos de la entrega) y el resumen del pedido con subtotal, delivery y total.

### Métodos de pago

Sobre las opciones va el título **Métodos de pago**.

Dos opciones excluyentes, una tarjeta seleccionable cada una:

- **Pago en línea**: "Paga con tarjeta u otros medios desde Mercado Pago". Sin seleccionar por defecto.
- **Contraentrega**: con Entrega, "Paga al recibir tu pedido"; con Recojo en tienda, "Paga al recoger tu pedido en tienda".

Ninguna viene preseleccionada: el cliente debe elegir una.

### Resumen

Reutiliza el resumen de HU-14/HU-17: platos, subtotal, delivery (`S/ 0.00` en Recojo en tienda) y total, con precios en formato `S/ 32.00`.

## Criterios de aceptación

### Acceso y estructura

- **Dado** cualquier persona, **cuando** abre `/checkout/pago` escribiendo la URL, desde un marcador o recargando, **entonces** es llevada a `/cart`.
- **Dado** un cliente en el paso Entrega con una selección válida (dirección con cobertura, o Recojo en tienda), **cuando** elige "Continuar", **entonces** llega a `/checkout/pago` con el indicador mostrando "Pago" resaltado.
- **Dado** un cliente en el paso Entrega sin selección válida (sin cobertura, calculando o con error), **cuando** miro "Continuar", **entonces** sigue deshabilitado como en HU-17.
- **Dado** que la compra empezó sin sesión, **cuando** llego a este paso, **entonces** el indicador muestra cinco pasos con "Pago" cuarto; si ya tenía sesión al empezar, cuatro con "Pago" tercero.
- **Dado** un cliente que quita todos los platos del carrito y vuelve con "atrás" del navegador, **cuando** llega a esta pantalla, **entonces** es llevado a `/cart`.

### Selección

- **Dado** que llego a este paso, **cuando** se muestra la pantalla, **entonces** veo las dos opciones sin ninguna seleccionada.
- **Dado** que elijo una opción, **cuando** la selecciono, **entonces** queda marcada (solo una a la vez) y puedo cambiarla.
- **Dado** que elegí Entrega en el paso anterior, **cuando** veo Contraentrega, **entonces** su descripción dice que pago al recibir el pedido; con Recojo en tienda dice que pago al recoger.
- **Dado** que cambié de método y luego regreso al paso Entrega con "Volver", **cuando** vuelvo a este paso, **entonces** se conserva el método elegido salvo que haya cambiado el tipo de entrega.

### Resumen

- **Dado** que llego a este paso, **cuando** miro la pantalla, **entonces** no veo la dirección ni el tipo de entrega elegidos, solo las opciones de pago y el resumen.
- **Dado** un pedido con Entrega, **cuando** veo el resumen, **entonces** el delivery muestra la tarifa calculada en HU-17 y el total la incluye.
- **Dado** un pedido con Recojo en tienda, **cuando** veo el resumen, **entonces** el delivery es `S/ 0.00` y el total es igual al subtotal.

### Continuar y volver

- **Dado** cualquier selección, **cuando** miro "Continuar", **entonces** está deshabilitado: el cobro (HU-19) y el detalle de contraentrega (HU-20) aún no existen y esta historia no navega hacia ellos.
- **Dado** que quiero volver, **cuando** elijo "Volver", **entonces** regreso a `/checkout/direcciones` con mi dirección y tipo de entrega conservados.

## Casos borde

- **Carrito modificado en otra pestaña** mientras se está en este paso: el resumen se actualiza con el carrito vigente.
- **Plato que dejó de estar disponible** o sin stock suficiente: no se valida aquí; lo valida el backend al crear el pedido (HU-21).
- **Total manipulado**: el cliente no envía importes; el backend recalcula subtotal, delivery y total al crear el pedido.
- **Sesión que expira** con la pantalla abierta: se lleva al cliente a `/cart`.
- **Recarga de la pantalla**: lleva a `/cart` y se pierde la selección.
- **Inicio de sesión con Google**: no aplica en este paso (la sesión ya existe).

## Fuera de alcance

- Crear el pedido y registrar el pago (HU-21), pagar con Mercado Pago (HU-19), efectivo, POS o Yape contraentrega (HU-20) y pago rechazado (HU-22).
- Guardar tarjetas o métodos de pago del cliente.
- Cupones, propinas o descuentos.
- Layout para celular, igual que HU-07, HU-08, HU-13, HU-14, HU-17 y HU-38.

## Impacto en documentación

- `docs/historias.md` y `docs/cronograma.md`: estado de HU-18.
- `specs/hu-17-direccion-checkout/spec.md`: el botón "Continuar" pasa a navegar a este paso.
- Con HU-19, el botón principal de este paso pasa a "Pagar" cuando se elige Pago en línea y crea el pedido; con Contraentrega sigue deshabilitado hasta HU-20.
- Con HU-20, Contraentrega abre un formulario (efectivo o Yape) y el botón principal pasa a "Confirmar pedido", que crea el pedido.
- `frontend/src/features/checkout/README.md`: pantalla y ruta nueva.
- Sin cambios en base de datos ni arquitectura (los pedidos y pagos llegan con HU-19 y HU-21).

## Decisiones de clarificación

- **Botón "Continuar" deshabilitado**: igual que HU-17, la navegación hacia el cobro (HU-19) y el detalle de contraentrega (HU-20) se conecta en esas historias.
- **Contraentrega también en Recojo en tienda**: se ofrece como "pagar al recoger", con texto distinto.
- **Sin restricciones extra para contraentrega**: no hay monto máximo ni zonas especiales; basta la cobertura exigida en HU-17.
- **Sin logos de medios de pago**: la opción de pago en línea es solo texto, hasta definir qué medios habilita la cuenta de Mercado Pago.
- **Dónde se guarda la elección**: en el estado de la aplicación del checkout, no en `localStorage`, igual que HU-17.

## Preguntas abiertas

Ninguna.
