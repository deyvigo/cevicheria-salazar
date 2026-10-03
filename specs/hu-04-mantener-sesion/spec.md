# Spec: HU-04 — Mantener la sesión iniciada

**Épica**: [E1. Autenticación y registro](../../docs/epicas.md#e1)
**Estado**: Hecha

## Objetivo

Que un Cliente no tenga que volver a iniciar sesión cada vez que abre la app, aunque hayan pasado varios días, mientras su sesión siga siendo válida.

## Contexto (qué ya existe y qué falta)

Desde HU-01/HU-02/HU-06 ya se emiten dos cookies al iniciar sesión:

- `access_token`: JWT de 15 minutos (`app.jwt.access-token-expiration-minutes`).
- `refresh_token`: opaco, 30 días, guardado con hash en `refresh_tokens` (`expires_at`, `revoked_at` ya existen en la tabla desde HT-06, pero **nada los usa todavía**).

Hoy, cuando el `access_token` vence (15 min), no hay forma de renovarlo: la persona queda con cookies inútiles hasta que vuelve a iniciar sesión a mano. Tampoco existe nada que, al abrir la app, le diga al frontend "ya hay una sesión válida" — `AuthContext` siempre arranca en `null`. Esta historia construye ambas piezas.

## Actor(es)

Cliente (con sesión ya iniciada por HU-01, HU-02 o HU-06).

## Criterios de aceptación

- **Dado** que inicié sesión hace menos de 30 días y mi `refresh_token` sigue vigente, **cuando** abro la app de nuevo (incluso en otra pestaña o tras cerrar el navegador), **entonces** sigo adentro, sin tener que ingresar mis datos.
- **Dado** que mi `access_token` venció pero mi `refresh_token` sigue vigente, **cuando** hago cualquier acción que necesite la API, **entonces** mi sesión se renueva automáticamente, sin que yo note nada ni tenga que volver a iniciar sesión.
- **Dado** que mi `refresh_token` también venció o fue invalidado, **cuando** abro la app o intento usarla, **entonces** quedo como Visitante (sin sesión), sin un error confuso — es el estado normal de no estar logueado.
- **Dado** que mi sesión se renueva, **cuando** eso pasa, **entonces** el `refresh_token` anterior queda inválido (no se puede reusar) y se emite uno nuevo — así, si alguien más llegara a tener mi `refresh_token` viejo, ya no le sirve.

## Casos borde

- Dos pestañas abiertas al mismo tiempo que renuevan la sesión casi en simultáneo (condición de carrera sobre el mismo `refresh_token`).
- Alguien presenta un `refresh_token` ya usado/revocado (posible señal de que el token fue copiado o interceptado).
- El `access_token` es inválido (manipulado) pero el `refresh_token` sigue siendo válido.

## Fuera de alcance

- Cerrar sesión (HU-05): esta historia no toca cómo se invalida una sesión a propósito, solo cómo se mantiene.
- Proteger endpoints por rol (ej. que `/admin` exija `ADMINISTRADOR`): el filtro que identifica quién es el usuario no bloquea nada todavía, solo permite que la app sepa quién está adentro.
- Mostrar al usuario cuántas sesiones/dispositivos tiene activos, o permitirle cerrarlas una por una.

## Decisiones de clarificación

- **Rotación del `refresh_token`**: se rota en cada renovación — se revoca el viejo (`revoked_at`) y se emite uno nuevo. Permite detectar un `refresh_token` reusado.
- **`refresh_token` ya revocado**: `401`, igual que si no existiera. No se trata como un robo confirmado ni se revocan las demás sesiones del usuario.
- **Cómo sabe el frontend que hay sesión**: endpoint nuevo `GET /api/auth/me`, llamado una vez al montar la app; `200` = hay sesión, `401` = no.
- **Renovación automática**: sí, vía un interceptor de axios que reintenta la petición una vez tras renovar ante cualquier `401` (salvo en login/registro/refresh mismos, para no entrar en bucle).
- **Filtro de validación del JWT**: sí, `JwtAuthFilter` (ya anticipado desde HT-09, nunca construido) — sin él, `/api/auth/me` no tiene forma de saber quién hizo la petición.
