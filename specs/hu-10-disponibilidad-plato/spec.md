# Spec: HU-10 — Saber si un plato está agotado o no disponible

**Épica**: [E2. Catálogo de productos](../../docs/epicas.md#e2)
**Estado**: En implementación

## Objetivo

Que un Visitante o Cliente vea, en el detalle de un plato, si se puede pedir o no, para no intentar pedir algo que Salazar SAC no puede preparar ese día. El detalle muestra un indicador de un pequeño punto de color y un texto: verde cuando el plato está disponible, rojo cuando está agotado o no disponible.

## Contexto (qué ya existe y qué falta)

Hoy el único estado de un plato es `active` (`is_active`): un plato inactivo se oculta por completo del catálogo y de su detalle (HU-07, HU-08). No existe un concepto de "agotado": un plato puede estar a la vista del cliente pero sin stock ese día. Esta historia lo introduce como un atributo distinto de `active`.

Quién cambia ese atributo es HU-30 (el administrador marca platos como disponibles o agotados). Esta historia solo deja el atributo en base de datos, pensando en que HU-30 lo use, y lo lee para mostrarlo en el detalle; no agrega ninguna forma de modificarlo desde la app. Hasta que exista HU-30, el valor se cambia por datos de semilla o directamente en base de datos.

El indicador va en la fila de la categoría del detalle (HU-08), alineado a la derecha.

## Actor(es)

Visitante y Cliente. El indicador es público: no requiere iniciar sesión.

## Modelo de datos

### Producto (plato): atributo nuevo

| Atributo    | Descripción                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `available` | Si el plato se puede pedir hoy (`is_available` en BD, igual convención que `is_active`). Por defecto `true`.            |

- `active` y `available` son independientes: `active = false` oculta el plato (como hasta ahora); `available = false` lo deja visible pero marcado como agotado.
- Un plato `active = false` nunca se muestra, tenga el valor que tenga `available`.
- Los platos existentes quedan con `available = true`.

## Pantalla

En el detalle del plato (`/products/{id}`), columna derecha, en la misma fila que la categoría y alineado a su derecha: un badge (pastilla) con un punto de color y un texto.

| Estado                | Badge                                                              | Texto        |
| --------------------- | ------------------------------------------------------------------ | ------------ |
| `available = true`    | Fondo y texto del par `lima` (éxito) del design system, punto verde | "Disponible" |
| `available = false`   | Fondo y texto del par `coral` (error) del design system, punto rojo | "Agotado"    |

El badge es una pastilla de bordes redondeados; el punto es pequeño (unos 8 px), circular y va centrado verticalmente respecto al texto, a su izquierda. Sin íconos de check ni de equis. Los detalles visuales (tamaños, espaciado) se afinan viendo la pantalla ya implementada.

El significado nunca depende solo del color: el punto va siempre acompañado del texto "Disponible" o "Agotado" (regla del design system para daltonismo).

## Criterios de aceptación

- **Dado** un plato con `available = true`, **cuando** abro su detalle, **entonces** veo, a la derecha de la categoría, el badge con el punto verde y el texto "Disponible".
- **Dado** un plato con `available = false`, **cuando** abro su detalle, **entonces** veo, a la derecha de la categoría, el badge con el punto rojo y el texto "Agotado".
- **Dado** un plato agotado, **cuando** veo el catálogo de su categoría, **entonces** el plato sigue apareciendo en la grilla y cuenta en el total (agotado no es lo mismo que inactivo), y puedo abrir su detalle.
- **Dado** un plato agotado, **cuando** abro su detalle, **entonces** veo igualmente su imagen, nombre, precio, calificación y descripción.
- **Dado** que el administrador cambió la disponibilidad de un plato, **cuando** abro o recargo su detalle, **entonces** veo el estado actual, no uno anterior.
- **Dado** que el detalle todavía no confirmó la disponibilidad con el servidor, **cuando** se muestra, **entonces** no aparece ningún estado (ni verde ni rojo) y el espacio del indicador ya está reservado; el estado aparece cuando llega la respuesta, sin mover el resto del contenido.
- **Dado** que no he iniciado sesión, **cuando** abro cualquier detalle, **entonces** veo el indicador igual.
- **Dado** un lector de pantalla, **cuando** llego al indicador, **entonces** lee el texto ("Disponible" o "Agotado"); el punto es decorativo.

## Casos borde

- **Estado provisional**: el detalle se pinta de inmediato con los datos de la tarjeta (HU-08), que no traen disponibilidad. Mostrar un "Disponible" provisional sería engañoso si el plato está agotado, por eso no se muestra estado hasta tener el dato real. El espacio se reserva para que el título y el resto no salten al llegar la respuesta (el mismo problema que ya apareció con la categoría en HU-08).
- **Dato desactualizado en caché**: volver a un detalle ya visitado puede mostrar el estado de la visita anterior mientras se vuelve a pedir; al llegar la respuesta se actualiza.
- **Plato inactivo y agotado a la vez**: manda `active`; el detalle responde "No encontramos este plato" (HU-08).
- **Cambio mientras se ve el detalle**: si el administrador marca el plato como agotado con la pantalla abierta, el cliente lo ve al recargar o al volver a entrar. No hay actualización en vivo.
- **Pedir un plato agotado por otra vía** (por ejemplo, con un carrito armado antes del cambio): lo resuelve el carrito y el checkout (ver Fuera de alcance); esta historia solo informa.

## Fuera de alcance

- Que el administrador marque platos como disponibles o agotados desde `/admin` (HU-30): ni pantalla, ni endpoint de escritura, ni cambios en la lógica de edición de platos. Aquí solo existe la columna y su lectura.
- Impedir agregar un plato agotado al carrito, y validar la disponibilidad al confirmar el pedido (HU-12 y checkout). Cuando exista "Agregar al carrito", debe deshabilitarse con este mismo estado y el servidor debe rechazarlo; aquí no hay carrito aún.
- Indicador de disponibilidad en las tarjetas del catálogo (la historia pide el detalle). Se puede agregar después con el mismo atributo.
- Cantidad de stock, "quedan N unidades" u horarios de disponibilidad.
- Avisar al cliente cuando un plato vuelva a estar disponible.
- Actualización en vivo del indicador (polling o websockets).
- Layout para celular, igual que HU-07 y HU-08.

## Decisiones de clarificación

- **Un solo estado**: "agotado" y "no disponible" son el mismo estado. Un único atributo `available` en la base de datos (decisión del usuario), pensado para que el administrador lo marque en HU-30. Esta historia solo agrega el atributo y su lectura.
- **Texto**: "Disponible" / "Agotado" (propuesta aceptada por defecto).
- **Listado y tarjetas**: el listado `GET /api/products?category=` no cambia y las tarjetas no muestran el estado; solo el detalle lo trae (propuesta aceptada por defecto).
- **Datos de semilla de desarrollo**: 2 o 3 platos agotados en `R__sample_products.sql` para verlo en local (propuesta aceptada por defecto).
