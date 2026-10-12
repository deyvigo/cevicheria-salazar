# Spec: HU-14 — Ver subtotal, costo de delivery y total

**Épica**: [E3. Carrito de compras](../../docs/epicas.md#e3)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente vea en `/cart` cuánto va a pagar: subtotal de los platos, descuento, costo de delivery y total, y que esos montos se actualicen al instante cuando cambia el carrito.

## Contexto (qué ya existe y qué falta)

- HU-12 y HU-13 dejaron `/cart` con la lista de platos (nombre, precio, control de cantidad, "Eliminar") y el botón "Compartir". Los precios y el stock de cada plato se leen del catálogo al abrir la pantalla.
- No hay todavía ningún cálculo de montos del pedido. Esta historia agrega solo la **presentación** del resumen; el pago y la confirmación son de E4.
- El descuento (cupones o promociones) no existe aún: se muestra siempre en `S/ 0.00`.
- El costo de delivery es una **tarifa fija de S/ 5.00**. Las zonas de delivery y tarifas variables dependen de la definición de requerimientos (HT-02) y quedan fuera.

## Actor(es)

Visitante y Cliente. No requiere iniciar sesión.

## Pantalla `/cart`

Con al menos un plato en el carrito, la pantalla se divide en dos columnas separadas por una **línea vertical**:

- **Izquierda**: la lista de platos, igual que hoy.
- **Derecha** (a la derecha de la línea): el **resumen del pedido**, con estas filas en este orden, cada una con su etiqueta a la izquierda y el monto alineado a la derecha:
  1. **Subtotal**: suma de `precio × cantidad` de los platos del carrito.
  2. **Descuento**: `S/ 0.00` por ahora.
  3. **Delivery**: `S/ 5.00`.
  4. **Total**: `subtotal − descuento + delivery`, destacado (mayor peso y tamaño) y separado del resto por una línea horizontal.

- Los montos usan el formato `S/ 32.00` (dos decimales).
- El resumen acompaña a la lista (permanece visible mientras se hace scroll por la lista).
- Con el carrito vacío no hay resumen ni línea vertical: se mantiene el estado vacío de HU-13.
- El botón "Compartir" y el título quedan donde están; el contenedor se ensancha lo necesario para alojar las dos columnas.
- Estilos con los tokens del `design-system/` (por ejemplo, el resumen como `Card`); no se inventan colores ni tipografías.

## Criterios de aceptación

- **Dado** un carrito con platos, **cuando** abro `/cart`, **entonces** veo la lista a la izquierda, una línea vertical y a su derecha el resumen con Subtotal, Descuento, Delivery y Total.
- **Dado** un carrito con 2 unidades de un plato a S/ 32.00 y 1 de otro a S/ 18.50, **cuando** miro el resumen, **entonces** el Subtotal es `S/ 82.50`, el Descuento `S/ 0.00`, el Delivery `S/ 5.00` y el Total `S/ 87.50`.
- **Dado** el resumen, **cuando** cambio la cantidad de un plato con **+**, **−** o el campo, **entonces** Subtotal y Total se actualizan al instante, sin recargar.
- **Dado** el resumen, **cuando** elimino un plato, **entonces** Subtotal y Total se recalculan sin ese plato.
- **Dado** que quito el último plato, **cuando** la lista queda vacía, **entonces** desaparecen el resumen y la línea vertical y veo "Tu carrito está vacío".
- **Dado** un plato agotado en el carrito, **cuando** miro el resumen, **entonces** ese plato no suma al Subtotal (no se puede pagar), y vuelve a sumar solo si recupera stock.
- **Dado** que los precios de `/cart` aún están cargando, **cuando** miro el resumen, **entonces** no muestra montos parciales: los muestra en estado de carga (igual que las filas) hasta conocer todos los precios.
- **Dado** que falló la carga del carrito, **cuando** veo el error con "Reintentar", **entonces** no se muestra el resumen.
- **Dado** que abro un carrito compartido, **cuando** se importa, **entonces** el resumen refleja los platos importados.
- **Dado** un lector de pantalla, **cuando** el total cambia, **entonces** el resumen es una región con nombre ("Resumen del pedido") y los montos se leen junto a su etiqueta.

## Casos borde

- **Precios con decimales** (`S/ 12.90 × 3`): el cálculo no debe producir errores de coma flotante visibles (`S/ 38.70`, no `S/ 38.69999`); se redondea a 2 decimales.
- **Plato inexistente o inactivo**: HU-12 lo quita del carrito sin aviso; el resumen se recalcula sin él.
- **Stock que baja**: la cantidad se ajusta al stock (HU-12) y el resumen usa la cantidad ajustada.
- **Todos los platos agotados**: Subtotal `S/ 0.00` y Total `S/ 5.00` (solo delivery); la pantalla ya avisa que quite los agotados. Ver Decisiones de clarificación.
- **Dos pestañas abiertas**: el cambio en una se refleja en la otra y su resumen se recalcula (sincronización de HU-12).

## Fuera de alcance

- Cualquier lógica real de descuentos (cupones, promociones): solo la fila en `S/ 0.00`.
- Delivery variable por zona, distancia, monto mínimo o envío gratis.
- Botón para continuar al pago / checkout (E4).
- Mostrar el resumen en el detalle del plato, el header o el checkout.
- Persistir o enviar los montos al backend: el servidor volverá a calcularlos al crear el pedido (E4); lo que se muestra aquí es informativo.
- Layout para celular, igual que HU-07, HU-08 y HU-13.

## Impacto en documentación

- `docs/`: ninguno (no cambia arquitectura, despliegue ni modelo de datos).
- `specs/hu-13-modificar-cantidad-carrito/spec.md`: "Subtotal, delivery y total por cantidad (HU-14)" ya figuraba fuera de alcance; sin cambios.

## Decisiones de clarificación

- **Platos agotados**: no suman al Subtotal, porque no se pueden comprar y el Total debe ser lo que realmente se pagaría.
- **Todos agotados**: el Delivery se sigue mostrando en `S/ 5.00` (delivery fijo mientras haya filas); el checkout lo validará.

## Preguntas abiertas

Ninguna.
