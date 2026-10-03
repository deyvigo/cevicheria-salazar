# Spec: HU-05 — Cerrar sesión

**Épica**: [E1. Autenticación y registro](../../docs/epicas.md#e1)
**Estado**: Hecha

## Objetivo

Que un Cliente pueda cerrar su sesión a propósito, para que nadie más que use el mismo dispositivo (por ejemplo, un computador compartido) pueda entrar a su cuenta.

## Contexto (qué ya existe y qué falta)

Desde HU-01/HU-02/HU-06 se emiten las cookies `access_token` (JWT, 15 minutos) y `refresh_token` (opaco, 30 días, guardado con hash en `refresh_tokens`). Desde HU-04 la sesión se mantiene sola: el `refresh_token` renueva el `access_token` y `AuthContext` recupera la sesión al abrir la app vía `GET /api/auth/me`.

Eso significa que hoy **no hay forma de salir**: aunque el usuario cierre el navegador, la sesión sigue viva hasta 30 días. La columna `refresh_tokens.revoked_at` ya se usa para la rotación de HU-04; esta historia la usa también para invalidar la sesión a propósito (ver `docs/diagrama-de-base-de-datos.md`). Tampoco existe ningún botón de "Cerrar sesión" en el frontend.

## Actor(es)

Cliente (con sesión iniciada por HU-01, HU-02 o HU-06).

## Criterios de aceptación

- **Dado** que tengo la sesión iniciada, **cuando** elijo "Cerrar sesión", **entonces** quedo como Visitante: la app deja de mostrarme como logueado y me lleva a una pantalla pública.
- **Dado** que cerré sesión, **cuando** vuelvo a abrir la app (incluso tras cerrar y abrir el navegador), **entonces** sigo como Visitante y debo iniciar sesión de nuevo.
- **Dado** que cerré sesión, **cuando** alguien intenta usar el `refresh_token` que tenía en ese dispositivo, **entonces** no le sirve: la sesión queda invalidada en el servidor, no solo borrada del navegador. El `access_token` (máximo 15 minutos) no se revoca: sigue siendo válido hasta que venza, pero ya no puede renovarse.
- **Dado** que tengo la sesión iniciada en dos dispositivos, **cuando** cierro sesión en uno, **entonces** el otro sigue con su sesión intacta.
- **Dado** que no tengo sesión, **cuando** abro la app, **entonces** el header muestra un botón "Iniciar sesión"; **y dado** que sí la tengo, muestra mi nombre, y al hacer clic en él se despliega un menú con la opción "Cerrar sesión".
- **Dado** que mi sesión ya venció o ya fue cerrada (por ejemplo, desde otra pestaña), **cuando** elijo "Cerrar sesión", **entonces** el resultado es el mismo — quedo como Visitante, sin un error confuso.
- **Dado** que cerré sesión en una pestaña, **cuando** reviso otra pestaña abierta de la app en el mismo navegador, **entonces** esa pestaña también deja de estar logueada en cuanto intente usar la API: las cookies se comparten entre pestañas y ya fueron borradas.

## Casos borde

- Cerrar sesión sin cookies (ya era Visitante) o con un `access_token` vencido pero `refresh_token` válido: debe cerrar igual.
- Cerrar sesión con un `refresh_token` desconocido, ya revocado o ya vencido.
- Cerrar sesión con la red caída o el backend inalcanzable: el usuario no debe quedar creyendo que salió si el servidor no invalidó la sesión.
- El interceptor de axios de HU-04 no debe intentar renovar la sesión como respuesta al propio `POST /api/auth/logout` (riesgo de bucle o de "resucitar" la sesión).
- Carrito: es de visitante y no requiere cuenta (E3), así que cerrar sesión no debe borrarlo.

## Fuera de alcance

- Cerrar sesión en todos los dispositivos a la vez, o listar/cerrar sesiones activas una por una (ya excluido en HU-04).
- Cerrar sesión automáticamente por inactividad.
- Navegación completa de la tienda (logo, categorías, carrito, enlaces): el header de esta historia es básico, solo muestra el estado de sesión.
- Invalidar el `access_token` en el servidor antes de que venza: es un JWT sin estado de 15 minutos; se borra la cookie del navegador y se deja vencer.
- Menú de usuario con otras opciones (perfil, pedidos): por ahora el desplegable solo tiene "Cerrar sesión".

## Decisiones de clarificación

- **Alcance del cierre**: solo el dispositivo/sesión desde donde se pide; las demás sesiones del usuario quedan intactas.
- **`access_token` tras cerrar sesión**: no se revoca. Se borra su cookie y se deja vencer (máximo 15 minutos). Lo que se revoca en PostgreSQL (`revoked_at`) es el `refresh_token`, así que nadie puede renovarlo. No hay cambios en `JwtAuthFilter`, ni columnas nuevas, ni consulta extra por petición. Riesgo aceptado: un `access_token` copiado antes del cierre sirve hasta que venza.
- **Header básico**: sin sesión muestra el botón "Iniciar sesión"; con sesión muestra el nombre del usuario, y al hacer clic se despliega un menú con "Cerrar sesión". Tras cerrar redirige a `/` con la notificación "Cerraste sesión".
- **Fallo del servidor**: no se cierra en el frontend; se muestra "No pudimos cerrar tu sesión, intenta de nuevo". Un `401` (sesión ya inválida) se trata como éxito.
- **Endpoint**: `POST /api/auth/logout` no exige autenticación, es idempotente y siempre responde `204`, revocando la sesión de la cookie si existe y borrando ambas cookies.
