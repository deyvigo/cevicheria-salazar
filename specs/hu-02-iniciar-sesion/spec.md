# Spec: HU-02 — Iniciar sesión

**Épica**: [E1. Autenticación y registro](../../docs/epicas.md#e1)
**Estado**: Hecha

## Objetivo

Que un Cliente con cuenta ya creada pueda iniciar sesión con su correo y contraseña, para acceder a su cuenta.

## Actor(es)

Cliente (ya registrado; ver HU-01).

## Criterios de aceptación

- **Dado** que tengo una cuenta activa, **cuando** ingreso mi correo y contraseña correctos, **entonces** inicio sesión (misma mecánica de HU-01: cookie `access_token` + `refresh_token`, `httpOnly`/`Secure`/`SameSite=Strict`) y accedo a la app como Cliente.
- **Dado** que ingreso un correo que no tiene cuenta, **cuando** intento iniciar sesión, **entonces** veo el mismo mensaje genérico que si la contraseña fuera incorrecta.
- **Dado** que ingreso una contraseña incorrecta para un correo que sí existe, **cuando** intento iniciar sesión, **entonces** veo el mensaje genérico ("Correo o contraseña incorrectos.").
- **Dado** que dejo vacío el correo o la contraseña, **cuando** intento enviar el formulario, **entonces** veo qué campo falta y no se envía la solicitud.
- **Dado** que fallo 3 veces seguidas con el mismo correo, **cuando** intento una cuarta vez, **entonces** el sistema me bloquea temporalmente con un mensaje distinto ("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."), sin decir cuánto tiempo exactamente.
- **Dado** que mi cuenta existe pero está inactiva (`is_active = false`), **cuando** intento iniciar sesión con las credenciales correctas, **entonces** veo el mismo mensaje genérico que ante credenciales incorrectas (no revela que la cuenta existe).

## Casos borde

- Correo que no existe vs. contraseña incorrecta vs. cuenta inactiva: los tres casos se ven igual para quien inicia sesión (mismo mensaje genérico), para no permitir enumerar correos registrados ni revelar el estado de la cuenta.
- Mayúsculas/minúsculas y espacios en el correo, igual que en HU-01.

## Fuera de alcance

- Mantener la sesión iniciada entre visitas / renovar el access token con el refresh token (HU-04).
- Cerrar sesión (HU-05).
- Login con Google (HU-06). Como consecuencia, **no existen hoy cuentas sin contraseña**: `password_hash` siempre tiene valor (todas las cuentas se crean por HU-01). El caso "cuenta solo-Google sin contraseña" no aplica todavía y se resuelve cuando se implemente HU-06.
- Recuperar contraseña (HU-03).

## Decisiones de clarificación

- **Límite de intentos**: 3 intentos fallidos por correo; al cuarto, se bloquea temporalmente (anti fuerza bruta vía Redis, con TTL — el tiempo exacto de bloqueo es un detalle de implementación, no se le comunica al usuario).
- **Mensaje ante correo inexistente, contraseña incorrecta o cuenta inactiva**: el mismo mensaje genérico en los tres casos ("Correo o contraseña incorrectos."), para no revelar cuál de ellos ocurrió.
- **Mensaje de bloqueo por intentos fallidos**: mensaje distinto al genérico ("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."), sin especificar el tiempo exacto de espera.
