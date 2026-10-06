# Spec: HU-03 — Recuperar contraseña por correo

**Épica**: [E1. Autenticación y registro](../../docs/epicas.md#e1)
**Estado**: Hecha

## Objetivo

Que un Cliente que olvidó su contraseña pueda restablecerla a través de un enlace enviado a su correo, para no perder el acceso a su cuenta.

## Actor(es)

Cliente (ya registrado; ver HU-01) que no puede iniciar sesión. Aún no tiene sesión activa.

## Criterios de aceptación

### Solicitar el enlace

- **Dado** que estoy en la pantalla de inicio de sesión, **cuando** hago clic en "¿Olvidaste tu contraseña?", **entonces** voy a una pantalla donde se me pide mi correo.
- **Dado** que ingreso el correo de una cuenta activa, **cuando** envío el formulario, **entonces** recibo un correo con un enlace para crear una nueva contraseña y veo un mensaje de confirmación genérico ("Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.").
- **Dado** que recibo el correo de recuperación, **cuando** lo leo, **entonces** el correo indica las reglas del enlace: vale 30 minutos desde su envío, se puede usar una sola vez, solo el enlace más reciente es válido (si pido otro, este deja de funcionar), no se pueden pedir más de 3 enlaces por día (el contador se reinicia pasadas 24 horas), y que si no lo pedí puedo ignorar el correo porque mi contraseña no cambia.
- **Dado** que ingreso un correo sin cuenta (o con cuenta inactiva), **cuando** envío el formulario, **entonces** veo exactamente el mismo mensaje de confirmación y no se envía ningún correo (no revela si el correo existe).
- **Dado** que dejo vacío el correo o su formato no es válido, **cuando** intento enviar el formulario, **entonces** veo el error en el campo y no se envía la solicitud.
- **Dado** que pido enlaces repetidamente con el mismo correo, **cuando** supero el límite de solicitudes, **entonces** veo un mensaje de espera ("Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde.") y no se envían más correos.

### Restablecer la contraseña

- **Dado** que abro el enlace del correo (que lleva un código que identifica mi solicitud), **cuando** el código es válido, no ha expirado y no se ha usado, **entonces** veo un formulario con nueva contraseña y su confirmación.
- **Dado** que escribo una nueva contraseña válida y su confirmación igual, **cuando** envío el formulario, **entonces** mi contraseña se actualiza, el enlace deja de funcionar y soy llevado al inicio de sesión con un mensaje de éxito ("Tu contraseña fue actualizada. Inicia sesión.").
- **Dado** que la nueva contraseña no cumple las reglas de HU-01 (mínimo 8 caracteres, una letra y un número) o no coincide con su confirmación, **cuando** intento enviar el formulario, **entonces** veo qué falla y no se envía la solicitud.
- **Dado** que abro un enlace con código inexistente, expirado o ya usado, **cuando** cargo la pantalla o envío el formulario, **entonces** veo un mensaje ("Este enlace no es válido o ya venció.") con una opción para pedir uno nuevo, y mi contraseña no cambia.
- **Dado** que cambié mi contraseña con éxito, **cuando** intento iniciar sesión, **entonces** la contraseña anterior ya no funciona y la nueva sí.
- **Dado** que cambié mi contraseña con éxito, **cuando** tenía sesiones abiertas en otros dispositivos, **entonces** esas sesiones se cierran (se invalidan sus refresh tokens).

## Casos borde

- **Varias solicitudes**: si pido más de un enlace, solo el más reciente es válido; los anteriores quedan invalidados al generar el nuevo.
- **Enlace de un solo uso**: tras usarse con éxito no puede reutilizarse, aunque no haya expirado.
- **Código seguro**: el código es aleatorio e impredecible, no derivable del correo ni del id del usuario. Solo se guarda su hash (`token_hash`), nunca en texto plano.
- **Correo con mayúsculas/espacios**: se normaliza igual que en HU-01/HU-02.
- **Bloqueo por intentos de login (HU-02)**: restablecer la contraseña con éxito limpia el contador de intentos fallidos de ese correo, para no seguir bloqueado.
- **Falla el envío del correo (SMTP caído)**: el usuario ve el mismo mensaje genérico (no se revela nada); el error se registra en el servidor.
- **Cuenta creada con Google (HU-06)**: ver pregunta abierta.

## Fuera de alcance

- Cambiar la contraseña estando con sesión iniciada desde el perfil (E5).
- Recuperar el acceso si el usuario ya no tiene acceso a su correo.
- Login automático tras restablecer la contraseña (se redirige al login).
- Diseño y plantilla visual avanzada del correo (HTML básico en español, tuteando).

## Decisiones de clarificación

- **Vigencia del enlace**: 30 minutos desde el envío. Se informa en el correo.
- **Límite de solicitudes**: 3 por correo por día, contadas en Redis. El contador se reinicia 24 horas después de la primera solicitud de la ventana (TTL de un día). Se informa en el correo.
- **Solicitudes simultáneas**: solo el enlace más reciente es válido; los anteriores quedan invalidados al generar uno nuevo. Se informa en el correo.
- **Cuentas creadas solo con Google (HU-06)**: se tratan como cualquier cuenta activa; el enlace les permite establecer una contraseña y desde entonces pueden entrar con ambos métodos. Hoy no aplica (HU-06 no está implementada).
- **Sesiones en otros dispositivos**: se cierran al cambiar la contraseña.
- **URLs del frontend**: `/olvide-contrasena` para pedir el correo y `/restablecer-contrasena?token=<código>` para el formulario.
