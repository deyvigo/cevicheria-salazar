# Spec: HU-16 — Conservar el carrito al cerrar la app sin iniciar sesión

**Épica**: [E3. Carrito de compras](../../docs/epicas.md#e3)
**Estado**: Hecha

## Objetivo

Que un Visitante que armó un carrito sin tener cuenta lo encuentre intacto al recargar, cerrar la pestaña o el navegador y volver más tarde, para no perder su selección.

## Contexto (qué ya existe y qué falta)

- HU-12 ya guarda el carrito en `localStorage` (Zustand `persist`, llave `salazar.carrito`) y lo sincroniza entre pestañas con el evento `storage`. Solo guarda `productId` y `quantity`; nombre, precio y stock se piden al servidor al abrir `/cart`.
- HU-12 dejó esta historia como la que **verifica** ese comportamiento y cubre los casos que queden (ver su "Fuera de alcance").
- Por tanto no hay funcionalidad nueva que construir: esta historia fija el comportamiento como contrato, con pruebas y una verificación en navegador, y deja decidido que el carrito no caduca (ver Decisiones).
- La persistencia es por navegador y dispositivo: no hay carrito en el servidor ni asociado a una cuenta (fuera de alcance).

## Actor(es)

Visitante (sin sesión). Un Cliente con sesión recibe el mismo comportamiento.

## Criterios de aceptación

- **Dado** que agregué platos sin iniciar sesión, **cuando** recargo la página, **entonces** el ícono del header y `/cart` muestran los mismos platos y cantidades.
- **Dado** que agregué platos sin iniciar sesión, **cuando** cierro la pestaña (o el navegador) y abro la tienda de nuevo en el mismo navegador, **entonces** el carrito conserva sus platos y cantidades.
- **Dado** que cambié cantidades o quité platos (HU-13), **cuando** recargo, **entonces** veo el carrito tal como lo dejé, no el estado anterior.
- **Dado** que pasó tiempo (días) desde la última visita, **cuando** vuelvo, **entonces** el carrito sigue ahí, sin caducar por sí solo.
- **Dado** un carrito guardado, **cuando** abro `/cart`, **entonces** nombre, precio y stock son los vigentes del servidor, no los de cuando agregué el plato (HU-12).
- **Dado** que un plato guardado ya no existe o está inactivo, **cuando** abro `/cart`, **entonces** desaparece del carrito sin aviso (HU-12).
- **Dado** que `localStorage` no está disponible (modo privado o bloqueado), **cuando** agrego platos, **entonces** el carrito funciona en memoria durante la pestaña y no hay error visible.
- **Dado** que el contenido guardado está corrupto, **cuando** abro la tienda, **entonces** parto de un carrito vacío, sin pantalla de error.
- **Dado** que tengo dos pestañas abiertas, **cuando** agrego un plato en una, **entonces** la otra lo refleja sin recargar.

## Casos borde

- **Otro navegador o dispositivo**: el carrito no viaja; para eso existe "Compartir" (HU-12).
- **Datos del sitio borrados** por el usuario: el carrito se pierde; es esperado.
- **Origen distinto** (`localhost` vs `127.0.0.1` o una IP de red): `localStorage` es por origen, así que son carritos separados. Solo afecta al desarrollo.
- **Versión del formato**: un valor guardado con una forma anterior (por ejemplo el arreglo previo a HU-12) se descarta y se parte vacío en lugar de fallar.

## Fuera de alcance

- Guardar el carrito en el servidor o asociarlo a una cuenta; sincronizarlo entre dispositivos.
- Caducidad del carrito o limpieza automática.
- Conservar el carrito al iniciar sesión o registrarse (HU-35).
- Vaciar el carrito al confirmar un pedido (E4).

## Impacto en documentación

- `docs/`: ninguno. `docs/diagrama-de-arquitectura.md` ya dice que el carrito vive en el cliente en un store de Zustand persistido en `localStorage` (HU-12 a HU-16, HU-35).

## Decisiones de clarificación

- **Sin caducidad**: el carrito se conserva indefinidamente en el navegador. No hace falta limpiarlo por antigüedad porque `/cart` siempre consulta al backend: precio, existencia y stock vigentes se reconcilian al abrirlo y un plato agotado se avisa (HU-12).

## Preguntas abiertas

Ninguna.
