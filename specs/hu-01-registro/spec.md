# Spec: HU-01 — Registro de cliente

**Épica**: [E1. Autenticación y registro](../../docs/epicas.md#e1)
**Estado**: Hecha

## Objetivo

Que un Visitante pueda crear una cuenta con su correo, nombre, teléfono y contraseña, para poder hacer pedidos y dar seguimiento a sus compras.

## Actor(es)

Visitante (se convierte en Cliente al completar el registro).

## Criterios de aceptación

- **Dado** que soy un Visitante sin cuenta, **cuando** completo el formulario con correo, nombres, apellidos, teléfono, contraseña y su confirmación (iguales entre sí), **entonces** se crea mi cuenta y accedo a la app como Cliente.
- **Dado** que escribo un correo que ya tiene una cuenta, **cuando** intento registrarme, **entonces** veo un mensaje que indica que ese correo ya está en uso, sin que el sistema decida por mí; yo elijo si inicio sesión o uso otro correo.
- **Dado** que dejo vacío alguno de los campos obligatorios (correo, nombres, apellidos, teléfono, contraseña), **cuando** intento enviar el formulario, **entonces** veo qué campo falta y no se envía la solicitud.
- **Dado** que escribo un correo con formato inválido, **cuando** intento enviar el formulario, **entonces** veo un mensaje indicando que el correo no es válido.
- **Dado** que escribo un teléfono que no tiene 9 dígitos o no empieza con 9, **cuando** intento enviar el formulario, **entonces** veo un mensaje indicando el formato esperado (9 dígitos, empieza con 9).
- **Dado** que escribo una contraseña de menos de 8 caracteres, sin letras o sin números, **cuando** intento enviar el formulario, **entonces** veo qué requisito falta.
- **Dado** que la contraseña y su confirmación no coinciden, **cuando** intento enviar el formulario, **entonces** veo un mensaje indicando que no coinciden y no se envía la solicitud.
- **Dado** que el registro fue exitoso, **cuando** se crea mi cuenta, **entonces** inicio sesión automáticamente, sin tener que volver a ingresar mis credenciales.
- **Dado** que tenía productos en el carrito como Visitante, **cuando** completo mi registro, **entonces** mi carrito se conserva (ver HU-35).
- **Dado** que el registro fue exitoso, **cuando** veo la confirmación, **entonces** los mensajes siguen el tono y los componentes del `design-system/` (tuteo, sin emojis, íconos de notificación con texto).

## Casos borde

- Dos intentos de registro simultáneos con el mismo correo (condición de carrera) — debe prevalecer uno solo; el otro recibe el error de correo duplicado.
- Espacios en blanco al inicio/fin de correo o nombres — se recortan antes de validar y guardar.
- Mayúsculas/minúsculas en el correo — se normaliza a minúsculas para la comparación de duplicados.

## Fuera de alcance

- Registro/login con Google (HU-06).
- Recuperar contraseña (HU-03).
- Inicio de sesión con cuenta ya existente (HU-02), salvo el login automático inmediatamente después de registrarse.
- Verificación de correo por enlace/código (no existe aún una historia para esto).

## Decisiones de clarificación

- **Contraseña**: mínimo 8 caracteres, al menos una letra y un número.
- **Verificación de correo**: no se exige por ahora. `email_verified` queda en `false`; se resuelve en una historia futura.
- **Login automático**: sí, el registro inicia sesión automáticamente.
- **Correo duplicado**: el mensaje solo informa que el correo ya está en uso; no se le indica una acción específica (iniciar sesión o cambiar de correo) — la decisión es del usuario.
- **Teléfono**: obligatorio, 9 dígitos, debe empezar con 9.
- **Confirmación de contraseña**: el formulario pide confirmarla; se valida solo en el frontend (no se envía al backend), ver `plan.md`.
