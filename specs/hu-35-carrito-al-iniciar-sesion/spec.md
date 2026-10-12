# Spec: HU-35 — Conservar el carrito y la pantalla al iniciar sesión o registrarse

**Épica**: [E3. Carrito de compras](../../docs/epicas.md#e3)
**Estado**: Hecha

## Objetivo

Que un Visitante que armó su carrito y luego inicia sesión, se registra o entra con Google no pierda su selección ni su lugar: al terminar vuelve a la pantalla en la que estaba, con los mismos platos.

## Contexto (qué ya existe y qué falta)

- El carrito vive en `localStorage` (HU-12, HU-16) y es independiente de la sesión: el código de auth (`use-auth-mutations.ts`, `AuthProvider`) no lee ni modifica el store del carrito, y ningún flujo lo vacía.
- Login y registro con correo no recargan la página (solo actualizan la consulta `me`); el login con Google es una navegación completa al backend y de vuelta al mismo origen del frontend. En ambos casos `localStorage` sobrevive.
- Con eso el comportamiento pedido ya se cumple **de forma implícita**, pero ninguna prueba lo protege: un cambio futuro (por ejemplo vaciar el store al cerrar sesión o fusionar con un carrito del servidor) podría romperlo sin que nada falle.
- No hay carrito en el servidor, por lo que no hay nada que fusionar al iniciar sesión.
- Hoy, tras iniciar sesión o registrarse, la app siempre manda a `/`, y Google redirige a `{frontend}/`; el cliente pierde la pantalla en la que estaba (por ejemplo `/cart` o un plato). Esta historia lo corrige. Cerrar sesión sigue yendo a `/` (HU-05).

## Actor(es)

Visitante que pasa a Cliente (iniciar sesión, registrarse, Google).

## Criterios de aceptación

- **Dado** un carrito con platos, **cuando** inicio sesión con correo y contraseña (HU-02), **entonces** el ícono del header y `/cart` conservan los mismos platos y cantidades.
- **Dado** un carrito con platos, **cuando** me registro (HU-01) y quedo con sesión iniciada, **entonces** el carrito se conserva igual.
- **Dado** un carrito con platos, **cuando** entro con Google (HU-06) y vuelvo a la tienda, **entonces** el carrito se conserva igual.
- **Dado** que pulso "Iniciar sesión" estando en una pantalla de la tienda (por ejemplo `/cart`, `/menu?q=ceviche` o `/products/12`), **cuando** inicio sesión con correo, **entonces** vuelvo a esa misma pantalla, con su búsqueda, y no a `/`.
- **Dado** que pulso "Iniciar sesión" desde una pantalla de la tienda, **cuando** me registro (HU-01) en lugar de iniciar sesión, **entonces** vuelvo a esa pantalla tras el aviso de cuenta creada.
- **Dado** que pasé de iniciar sesión a registrarme (o al revés) con los enlaces del formulario, **cuando** termino, **entonces** vuelvo igualmente a la pantalla original.
- **Dado** que pulso "Iniciar sesión" desde una pantalla de la tienda, **cuando** entro con Google (HU-06), **entonces** al volver a la tienda llego a esa pantalla y no a `/`.
- **Dado** que llego al formulario sin venir de una pantalla de la tienda (enlace directo, recuperar contraseña), **cuando** inicio sesión, **entonces** voy a `/`.
- **Dado** que el inicio de sesión falla, **cuando** veo el error, **entonces** sigo en el formulario y el origen se mantiene para el siguiente intento.
- **Dado** que cierro sesión (HU-05), **cuando** termina, **entonces** voy a `/` con el aviso "Cerraste sesión", como hasta ahora.
- **Dado** que inicio sesión con el carrito vacío, **cuando** abro `/cart`, **entonces** veo "Tu carrito está vacío" y no aparecen platos que no agregué.
- **Dado** un carrito con platos, **cuando** la sesión se restaura sola al abrir la app (HU-04), **entonces** el carrito no cambia.
- **Dado** un inicio de sesión fallido (credenciales inválidas, cuenta bloqueada, error de Google), **cuando** vuelvo a la tienda, **entonces** el carrito sigue intacto.
- **Dado** un carrito con platos, **cuando** cierro sesión (HU-05), **entonces** el carrito se conserva igual: cerrar sesión no lo vacía.

## Casos borde

- **Cierre de sesión en equipo compartido**: como cerrar sesión no vacía el carrito, la siguiente persona que use ese navegador lo ve. Riesgo aceptado: el carrito no contiene datos personales, solo ids y cantidades.
- **Mismo navegador, otra cuenta**: el carrito pertenece al navegador, no a la cuenta; si otra persona inicia sesión ahí ve el mismo carrito. Es consecuencia de no tener carrito en el servidor.
- **Origen distinto en desarrollo** (`localhost` vs IP de red): son carritos separados; además Google OAuth no funciona fuera de `localhost` (ver `AGENTS.md`).
- **Origen inseguro o inválido**: la pantalla de origen es entrada no confiable. Solo se aceptan rutas internas de la app; un enlace a otro dominio, `//dominio`, o las propias pantallas de autenticación se ignoran y se va a `/`.
- **Google abandonado**: la pantalla de origen guardada para Google caduca a los 10 minutos para que un intento abandonado no desvíe un inicio de sesión posterior.
- **Almacenamiento no disponible**: si no se puede guardar el origen para Google, se llega a `/` y el carrito sigue intacto.
- **Dos pestañas**: iniciar sesión en una no afecta el carrito de la otra, y los cambios del carrito se siguen sincronizando por `storage`.
- **Plato que ya no se puede pedir** al volver tras iniciar sesión: se reconcilia en `/cart` como en HU-12 (agotado se marca, inactivo se quita).

## Fuera de alcance

- Guardar o fusionar el carrito en el servidor por cuenta.
- Carritos distintos por usuario en un mismo navegador.
- Redirigir al checkout tras iniciar sesión (E4) ni forzar el inicio de sesión para pagar.
- Que cerrar sesión devuelva a la pantalla de origen: sigue yendo a `/` por ahora.
- Cambiar el flujo de login, registro o Google (HU-01, HU-02, HU-06).

## Impacto en documentación

- `docs/`: ninguno. La arquitectura ya describe el carrito en el cliente (HU-12 a HU-16, HU-35).

## Decisiones de clarificación

- **Sin fusión**: al no existir carrito del servidor, "conservar" significa no tocar el carrito local en ningún flujo de autenticación.
- **Cerrar sesión no borra el carrito**: el carrito es del navegador (HU-16), no de la cuenta.
- **Volver a la pantalla de origen**: aplica a iniciar sesión, registrarse y Google; cerrar sesión sigue yendo a `/` (decisión del usuario, "por ahora").

## Preguntas abiertas

Ninguna.
