# Spec: HU-30 — Marcar platos como disponibles o agotados

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador cambie con un clic, desde la tabla de **Platos** de `/admin` y sin abrir el diálogo de edición, si un plato está **activo** (forma parte de la carta) y si está **disponible** (se puede pedir hoy), para reflejar el stock del día con rapidez.

## Contexto (qué ya existe y qué falta)

- HU-10 dejó `is_available` y su lectura: un plato no disponible sigue visible en la tienda marcado como "Agotado". HU-12 añadió el `stock`: un plato se puede pedir solo si `is_available` y `stock > 0`.
- HU-29 creó la tabla de platos, el diálogo de edición (que ya incluye Activo, Disponible y Stock) y el endpoint `PUT /api/admin/products/{id}`. Cambiar un estado obligaba a abrir el diálogo, editar y guardar.
- Esta historia añade los **interruptores (switch) en la tabla**; no agrega endpoints ni cambios en la base de datos: reutiliza el `PUT` de HU-29.

## Actor(es)

Administrador con sesión iniciada. Visitante y Cliente no tienen acceso (ver Seguridad de HU-29).

## Criterios de aceptación

- **Dado** la tabla de platos, **cuando** miro las columnas **Activo** y **Disponible**, **entonces** cada fila tiene un interruptor por columna: verde pastel con el círculo a la derecha si está activado, y crema con el círculo a la izquierda si no.
- **Dado** que hago clic en un interruptor, **cuando** lo pulso, **entonces** el círculo se desliza al otro lado con una animación suave, el interruptor queda bloqueado mientras se guarda, y el cambio se guarda en el servidor sin abrir el diálogo ni modificar el resto de los datos del plato (nombre, descripción, precio, categoría, stock e imágenes).
- **Dado** que desactivo **Activo**, **cuando** se guarda, **entonces** el plato desaparece de la tienda pero sigue en la tabla del panel.
- **Dado** que desactivo **Disponible**, **cuando** se guarda, **entonces** el plato sigue visible en la tienda marcado como "Agotado" (HU-10) y no se puede agregar al carrito.
- **Dado** que activo **Disponible** en un plato con stock mayor que 0, **cuando** se guarda, **entonces** el plato vuelve a poder pedirse.
- **Dado** que el servidor rechaza el cambio o no responde, **cuando** termina el intento, **entonces** el interruptor vuelve a su estado anterior y veo la notificación "No pudimos actualizar el plato, intenta de nuevo".
- **Dado** que cambio los dos interruptores de un plato casi a la vez, **cuando** se guardan, **entonces** el segundo cambio no deshace el primero.
- **Dado** que cambio un interruptor, **cuando** la lista se actualiza, **entonces** conservo la búsqueda, el orden y la página en los que estaba.
- **Dado** un lector de pantalla o el teclado, **cuando** llego a un interruptor, **entonces** se anuncia como interruptor con su estado y el nombre del plato ("Activo: Ceviche mixto" / "Disponible: Ceviche mixto"), y se cambia con Enter o espacio.
- **Dado** que el sistema o el usuario tiene activada la reducción de movimiento, **cuando** cambio un interruptor, **entonces** el cambio es inmediato, sin animación.

## Casos borde

- **Disponible no es el estado efectivo**: el interruptor refleja `is_available` tal cual. Un plato con Disponible activado y stock 0 se ve "Agotado" en la tienda (regla de HU-10/HU-12); el interruptor sigue activado y el stock se edita en el diálogo. No se acopla `is_available` con el stock (así "apagado a mano" y "sin stock" no se confunden).
- **Plato sin imágenes**: el cambio usa el mismo `PUT` de HU-29, que exige al menos una imagen; si el plato no tiene ninguna, el servidor lo rechaza y se muestra el error. Los platos creados desde el panel siempre tienen al menos una.
- **Cambio simultáneo con el diálogo**: el interruptor envía todos los datos del plato tal como los cargó la tabla; si otro administrador editó el plato entre tanto, gana el último guardado (igual que en HU-29).
- **Plato eliminado desde otra pestaña**: el servidor responde 404, el interruptor vuelve a su estado y se muestra el error genérico; la lista se actualiza.
- **Sesión vencida**: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión.
- **Otro cliente con la tienda abierta**: ve el cambio al recargar o al vencer su caché (5 minutos), no al instante.

## Fuera de alcance

- Editar el **stock** desde la tabla sin abrir el diálogo; el stock se cambia en el diálogo (HU-29).
- Cambiar automáticamente `is_available` cuando el stock llega a 0, o descontar stock al confirmar un pedido (checkout).
- Mostrar en la tabla el estado efectivo ("Sin stock") en lugar del valor de `is_available`.
- Cambiar varios platos a la vez (selección múltiple).
- Programar la disponibilidad por horario o por día.
- Actualización en vivo de la tienda.

## Decisiones de clarificación

- **Switches en la tabla** (decisión del usuario): Activo y Disponible se cambian con interruptores en la tabla, sin diálogo. El interruptor compartido (`Switch`) también lo usa el diálogo de HU-29.
- **Colores**: pista `lima-300` (verde pastel) activada y `naranja-200` (crema) desactivada, con círculo `surface`; solo tokens del design system.
- **Sin endpoints nuevos**: se reutiliza el `PUT` de HU-29 con los demás datos del plato, en lugar de agregar un `PATCH` parcial.

## Preguntas abiertas

Ninguna.
