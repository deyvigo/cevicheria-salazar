# Spec: HU-06 — Registrarse o iniciar sesión con Google

**Épica**: [E1. Autenticación y registro](../../docs/epicas.md#e1)
**Estado**: Hecha

## Objetivo

Que un Visitante pueda registrarse o iniciar sesión usando su cuenta de Google, sin tener que completar el formulario de HU-01 ni recordar una contraseña.

## Actor(es)

Visitante (se convierte en Cliente). También cubre a un Cliente que ya se registró con HU-01 y quiere entrar con Google usando el mismo correo.

## Criterios de aceptación

- **Dado** que soy un Visitante sin cuenta, **cuando** elijo "Continuar con Google" y apruebo el acceso en la pantalla de Google, **entonces** se crea mi cuenta (correo y nombre que entrega Google, sin contraseña) y accedo a la app como Cliente, con la misma mecánica de sesión de HU-01/HU-02 (cookies `access_token`/`refresh_token`).
- **Dado** que ya tengo una cuenta creada con Google, **cuando** vuelvo a elegir "Continuar con Google", **entonces** inicio sesión con esa misma cuenta (no se crea una segunda).
- **Dado** que ya tengo una cuenta creada con HU-01 (correo y contraseña) y el correo de mi cuenta de Google coincide, **cuando** elijo "Continuar con Google" por primera vez, **entonces** mi cuenta existente queda vinculada a Google (puedo seguir entrando con contraseña o con Google, cualquiera de las dos).
- **Dado** que cancelo o rechazo el acceso en la pantalla de Google, **cuando** vuelvo a la app, **entonces** no se crea ninguna cuenta y veo un mensaje indicando que no se pudo completar el inicio de sesión.
- **Dado** que el botón "Continuar con Google" existe, **cuando** lo veo en `/registro` o en `/iniciar-sesion`, **entonces** hace lo mismo en los dos lugares (es una sola acción, no dos distintas).

## Casos borde

- Dos pestañas o intentos simultáneos completando el mismo login de Google para una cuenta nueva (condición de carrera análoga a HU-01 con el correo duplicado).
- Google no entrega teléfono: la cuenta creada por esta vía queda con `phone = null` hasta que la persona lo complete (no hay historia todavía para editar el perfil — HU-23 — así que por ahora queda vacío).
- El token/código que devuelve Google ya fue usado o expiró (reintento del navegador, enlace viejo, etc.).

## Fuera de alcance

- Completar el teléfono faltante de una cuenta creada por Google (eso es HU-23, perfil del cliente).
- Desvincular una cuenta de Google ya vinculada.
- Cualquier otro proveedor de login social (solo Google).

## Decisiones de clarificación

- **Flujo de Google**: el de redirección del servidor (`spring-boot-starter-security-oauth2-client`, ya en el `pom.xml`). El botón "Continuar con Google" enlaza a `GET /oauth2/authorization/google` (no es una llamada de axios); Google redirige a un callback del backend; el backend termina redirigiendo al navegador de vuelta al frontend ya con las cookies puestas. No se usa Google Identity Services/One Tap del lado del cliente.
- **Redirección al terminar**: a `/` si todo salió bien; a `/iniciar-sesion?error=google` si falló o se canceló, para que el frontend muestre el mensaje ahí.
- **`email_verified`**: `true` para una cuenta creada por Google (a diferencia de HU-01, donde queda en `false`), porque Google ya verificó ese correo.
- **Cuenta inactiva**: mismo criterio que HU-02 — no se vincula ni se inicia sesión, mensaje de error genérico, sin decir que la cuenta existe.

## Credenciales de Google

Ya creadas: OAuth 2.0 Client ID (tipo "Web application") en Google Cloud Console, con `http://localhost:8080/login/oauth2/code/google` como redirect URI de desarrollo. Client ID/Secret van en `backend/.env` (`GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET`, ya existían vacíos en `.env.example` desde HT-09).
