# Spec: HU-46 — Platos más vendidos en la página de inicio (bento)

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: Hecha

## Objetivo

Que el Visitante vea en la página de inicio, debajo del hero (HU-45), una sección con los platos que más se piden, en una grilla tipo bento de pocas casillas, para decidir rápido qué pedir. La grilla siempre se ve completa: si todavía hay pocos platos vendidos, las casillas que faltan se completan con otros platos de la carta.

## Contexto (qué ya existe y qué falta)

- La página de inicio (`/`) solo tiene el hero (HU-45).
- Los pedidos guardan sus platos en `order_items` (`product_id`, `quantity`). El reporte de ventas del panel (HU-34) ya calcula los platos más vendidos, pero por nombre del plato, solo para el Administrador y con sus filtros.
- Los platos tienen `is_active`, `is_available`, `stock`, `rating` (promedio de reseñas, HU-41) e imagen. La carta (`/menu`) ya tiene la tarjeta de plato (`ProductCard`) con foto, nombre, precio, calificación y los botones del carrito.
- Hoy hay muy pocas ventas (2 platos vendidos), así que la sección tiene que funcionar bien con pocos datos.

## Actor(es)

Visitante y Cliente (la página de inicio es pública).

## Criterios de aceptación

### Qué platos aparecen

- **Dado** que abro `/`, **cuando** carga, **entonces** veo debajo del hero la sección "Los favoritos de la casa" con **5 casillas**: una grande y cuatro chicas.
- **Dado** los platos vendidos en los **últimos 30 días** (solo pedidos **pagados**, por su fecha de pago, igual que el reporte de ventas de HU-34: un pedido contraentrega cuenta recién cuando se entrega y se cobra), **cuando** se arma la grilla, **entonces** los más vendidos por unidades van primero, el primero en la casilla grande; en empate, el de más ingresos y luego el de nombre alfabético.
- **Dado** que hay menos de 5 platos vendidos, **cuando** se arma la grilla, **entonces** las casillas que faltan se completan con los platos **mejor calificados** que no estén ya en la grilla y, si aún faltan, con los **más recientes** de la carta.
- **Dado** cualquier casilla, **cuando** se elige su plato, **entonces** solo entran platos **activos y disponibles con stock**; un plato vendido pero agotado o inactivo no aparece y su lugar lo toma el siguiente.
- **Dado** un plato que está en la grilla por ventas, **cuando** lo miro, **entonces** lleva la etiqueta **"Más vendido"**; los platos de relleno no la llevan.
- **Dado** que hay menos de 3 platos activos y disponibles en toda la carta, **cuando** abro `/`, **entonces** la sección no se muestra.

### Cada casilla

- **Dado** una casilla, **cuando** la miro, **entonces** veo la foto del plato, su nombre, su precio (`S/ 32.00`) y el botón "Agregar" de la carta; la foto y el nombre enlazan a su detalle (`/products/{id}`).
- **Dado** el botón "Agregar" de una casilla, **cuando** lo pulso, **entonces** el plato se agrega al carrito igual que desde la carta (con el mismo aviso y los mismos límites de stock), sin salir de la página de inicio.
- **Dado** la casilla grande, **cuando** la miro, **entonces** ocupa el doble de ancho y de alto que las chicas.

### Navegación y estados

- **Dado** la sección, **cuando** la miro, **entonces** tiene un enlace "Ver toda la carta" a `/menu`.
- **Dado** que la sección aún no recibió los platos, **cuando** carga, **entonces** veo la grilla con casillas de carga (sin saltos de diseño al llegar los datos); si falla, la sección no se muestra y el resto de la página sigue funcionando.

### Adaptación

- **Dado** una pantalla de celular, **cuando** abro `/`, **entonces** la grilla pasa a dos columnas con la casilla grande arriba a todo el ancho.

## Casos borde

- **Pocas ventas** (hoy, 2 platos pagados): 2 casillas con "Más vendido" y 3 de relleno.
- **Un plato vendido que se eliminó o cambió de nombre**: cuenta por `product_id`; si ya no existe o no está activo, no aparece.
- **Platos sin foto**: la casilla muestra la imagen de respaldo de la carta (`dish-placeholder.svg`).
- **Plato que se agota con la página abierta**: sigue en la grilla hasta recargar; su botón "Agregar" respeta el stock que conoce y el checkout vuelve a validar, como en la carta (HU-10).

## Fuera de alcance

- Otras secciones de la página de inicio (categorías, reseñas, información del local): historias posteriores.
- Elegir a mano desde el panel qué platos destacar.
- Promociones y ofertas (HU-11).

## Impacto en documentación

- `docs/historias.md`, `docs/epicas.md`: HU-46. `docs/cronograma.md`: Sprint 3, semana 3.

## Decisiones de clarificación

- **Casillas**: 5 (una grande y cuatro chicas), con relleno por mejor calificación y luego por más recientes, para que la grilla siempre se vea completa sin mostrar demasiados platos.
- **Carrito**: cada casilla lleva el botón "Agregar" de la carta.
- **Título**: "Los favoritos de la casa".
- **Ventana**: ventas de los últimos 30 días.
- **Qué es una venta**: solo pedidos pagados (`PAGADO`, por `paid_at`), como en Reportes. Un contraentrega por cobrar no cuenta todavía: puede terminar rechazado o fallido y nunca cobrarse.

## Preguntas abiertas

Ninguna.
