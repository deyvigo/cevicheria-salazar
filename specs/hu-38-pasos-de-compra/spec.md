# Spec: HU-38 — Ver los pasos de la compra en el carrito

**Épica**: [E4. Checkout y pagos](../../docs/epicas.md#e4)
**Estado**: Hecha

## Objetivo

Que un Visitante o Cliente vea en `/cart` los pasos de la compra (Carrito, Inicio de sesión, Entrega, Pago y ¡Listo!) con el paso actual resaltado, para saber en qué punto está y qué falta. Esta historia entrega **solo el esqueleto**: el indicador de pasos. La funcionalidad de cada paso es de otras historias.

## Contexto (qué ya existe y qué falta)

- `/cart` tiene la lista de platos, el resumen del pedido y el botón "Compartir" (HU-12 a HU-14).
- El inicio de sesión se exige al realizar el pedido (E3); la dirección, el pago y la confirmación son de E4 (HU-17 a HU-22) y aún no existen.
- La sesión se conoce por `useAuth()` (`user`, `isLoading`).
- No hay botón para continuar al checkout ni pantallas para los pasos 2 a 5. Por eso esta historia no navega a ningún lado: solo muestra el indicador.

## Actor(es)

Visitante y Cliente. No requiere iniciar sesión.

## Indicador de pasos

Un componente reutilizable, mostrado arriba del contenido de `/cart`, debajo del título. Pasos en fila, unidos por una línea. Son cinco para un visitante y **cuatro para quien ya inició sesión**, porque el paso "Inicio de sesión" solo se muestra cuando no hay sesión:

| Sin sesión | Con sesión | Título             | Descripción                    |
| ---------- | ---------- | ------------------ | ------------------------------ |
| 1          | 1          | Carrito de compras | Revisa tus productos           |
| 2          | (no sale)  | Inicio de sesión   | Ingresa a tu cuenta            |
| 3          | 2          | Entrega            | Elige dónde recibir tu pedido  |
| 4          | 3          | Pago               | Elige cómo vas a pagar         |
| 5          | 4          | ¡Listo!            | Revisa el detalle de tu pedido |

- Los números se asignan según los pasos visibles, siempre consecutivos desde 1 (con sesión, Entrega es el 2).
- Cada paso es un círculo con su número, y debajo el título y la descripción.
- El paso actual se resalta (círculo con el color de acción del design system y número en contraste); los demás van en un estilo neutro. En `/cart` el paso actual es **Carrito de compras**.
- La línea entre círculos conecta cada paso con el siguiente.
- El componente recibe el paso actual (por su identidad: carrito, inicio de sesión, entrega, pago o listo) y si hay sesión, de modo que las pantallas de las historias de E4 lo reutilicen sin cambios; en esta historia solo `/cart` lo usa.
- Mientras se verifica la sesión (`isLoading`) el indicador no se muestra, para que no aparezca y luego pierda un paso.
- Es **informativo**: los pasos no son enlaces ni botones y no hay navegación entre ellos.
- Aparece solo cuando el carrito tiene platos (junto con la lista y el resumen). Con el carrito vacío o con error de carga no se muestra y se mantienen los estados de HU-13.
- Estilos con los tokens del `design-system/` (el contenedor como `Card`); no se inventan colores ni tipografías.
- Todos los textos en español, sin emojis.

## Criterios de aceptación

- **Dado** un visitante sin sesión con platos en el carrito, **cuando** abro `/cart`, **entonces** veo bajo el título el indicador con los cinco pasos, en orden, cada uno con su número, título y descripción.
- **Dado** un cliente con sesión iniciada y platos en el carrito, **cuando** abro `/cart`, **entonces** el indicador muestra cuatro pasos (Carrito de compras, Entrega, Pago, ¡Listo!), numerados del 1 al 4, sin "Inicio de sesión".
- **Dado** un visitante en `/cart`, **cuando** inicia sesión y vuelve a `/cart`, **entonces** el paso "Inicio de sesión" ya no aparece y la numeración se reajusta.
- **Dado** que la sesión aún se está verificando, **cuando** abro `/cart`, **entonces** el indicador no se muestra hasta conocer si hay sesión.
- **Dado** el indicador en `/cart`, **cuando** lo miro, **entonces** "Carrito de compras" está resaltado y los demás pasos se ven en estilo neutro.
- **Dado** el indicador, **cuando** hago clic o toco un paso, **entonces** no ocurre nada (no navega ni cambia el paso resaltado).
- **Dado** que el enlace de "Compartir" se genera desde `/cart`, **cuando** otra persona (o yo) lo abre, **entonces** el indicador aparece siempre en el primer paso ("Carrito de compras"), porque el enlace solo lleva los platos y no el paso.
- **Dado** que quito el último plato, **cuando** el carrito queda vacío, **entonces** el indicador desaparece y veo "Tu carrito está vacío".
- **Dado** que falló la carga del carrito, **cuando** veo el error con "Reintentar", **entonces** no se muestra el indicador.
- **Dado** el componente, **cuando** se le indica otro paso actual (por ejemplo "Entrega"), **entonces** resalta ese paso y deja los demás en estilo neutro (para uso de las historias de E4).
- **Dado** un lector de pantalla, **cuando** recorro el indicador, **entonces** lo anuncia como una lista ordenada de los pasos visibles con nombre ("Pasos de la compra") y marca el paso actual como tal (`aria-current="step"`).

## Casos borde

- **Texto largo o ventana angosta**: títulos y descripciones se ajustan en varias líneas sin desbordar ni solaparse con el paso vecino.
- **Sesión que expira o se cierra**: si cambia el estado de sesión con `/cart` abierta, el indicador se actualiza con el nuevo conjunto de pasos.
- **Paso actual oculto**: si se pide como actual "Inicio de sesión" estando con sesión, no se resalta ningún paso (no ocurre en `/cart`).
- **Carrito compartido**: al importar un carrito desde un enlace, el indicador aparece siempre en el paso 1. El enlace lo genera "Compartir" (HU-12) como `/cart?c=<platos>` y no incluye el paso: cuando las pantallas de los pasos 2 a 5 existan, "Compartir" seguirá apuntando a `/cart` y no debe añadirle el paso actual.
- **Resumen y lista**: el indicador no altera el comportamiento de la lista ni del resumen sticky de HU-14.

## Fuera de alcance

- Cualquier funcionalidad de los pasos 2 a 5: inicio de sesión dentro del flujo, selección de entrega, pago y confirmación (HU-17 a HU-22, E1).
- Botón "Continuar" o cualquier navegación entre pasos.
- Rutas o pantallas de checkout.
- Marcar pasos como completados (la marca solo distingue el paso actual).
- Incluir el paso en el enlace de "Compartir": el enlace siempre abre el carrito en el primer paso.
- Mostrar el indicador en otras pantallas (detalle de plato, perfil).
- Layout para celular, igual que HU-07, HU-08, HU-13 y HU-14.

## Impacto en documentación

- `docs/historias.md`, `docs/epicas.md` y `docs/cronograma.md`: alta de HU-38.
- `frontend/src/features/checkout/README.md`: mencionar el componente.
- `docs/` (arquitectura, base de datos, despliegue): ninguno.

## Decisiones de clarificación

- **Épica E4**: el indicador es la estructura del checkout, aunque hoy solo se vea en `/cart`.
- **Inicio de sesión condicional**: con sesión ese paso no aporta nada; omitirlo evita mostrar un paso ya cumplido.
- **Sin indicador mientras carga la sesión**: evita un salto visual de cinco a cuatro pasos.
- **Solo visible con platos**: igual que el resumen de HU-14; un carrito vacío no está en el flujo de compra.
- **Informativo**: sin botón de continuar ni rutas de checkout no hay a dónde navegar; cada historia de E4 conectará su paso.
- **Textos**: se adaptan al negocio ("tu cuenta", "tu pedido") y al tuteo del proyecto.

## Preguntas abiertas

Ninguna.
