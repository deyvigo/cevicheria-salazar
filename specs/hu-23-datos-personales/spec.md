# Spec: HU-23 — Ver y editar mis datos personales

**Épica**: [E5. Perfil del cliente](../../docs/epicas.md#e5)
**Estado**: Hecha

## Objetivo

Que un Cliente con sesión iniciada pueda ver y actualizar sus datos básicos (nombres, apellidos y teléfono) y cambiar su contraseña, para mantener su cuenta al día sin depender del negocio.

## Contexto (qué ya existe y qué falta)

Los datos `first_name`, `last_name` y `phone` se piden al registrarse (HU-01) y se guardan en `users`, pero hoy no hay forma de verlos ni modificarlos. Las cuentas creadas con Google (HU-06) quedan con `phone = null` y sin contraseña; HU-06 dejó explícito que completar el teléfono es de esta historia. La contraseña solo puede cambiarse hoy por el flujo de recuperación por correo (HU-03), que dejó fuera "cambiarla con sesión iniciada desde el perfil".

El perfil es una sección con navegación vertical, parecida a la del panel de administración (HU-28), que crecerá con HU-24 (direcciones) y HU-25/HU-26 (pedidos). Esta historia crea esa navegación con una sola pestaña, **Mi información**, que agrupa dos bloques independientes: datos básicos y contraseña. A diferencia del panel de administración, el header superior de la tienda se mantiene.

## Actor(es)

Cliente con sesión iniciada (HU-01, HU-02 o HU-06). Los administradores no usan `/perfil`: reutilizan esta misma pantalla y API desde su panel (HU-36).

## Criterios de aceptación

### Navegación del perfil

- **Dado** que soy Cliente con la sesión iniciada, **cuando** abro el menú de mi nombre en el header, **entonces** veo la opción "Mi perfil" antes de "Cerrar sesión", y al elegirla llego al perfil.
- **Dado** que estoy en el perfil, **cuando** miro la pantalla, **entonces** el header superior sigue visible (logo, Carta, buscador, carrito y menú de cuenta) y, debajo, hay una navegación vertical a la izquierda con la pestaña "Mi información" activa y el contenido a la derecha. La navegación ocupa todo el alto disponible hasta el final de la pantalla y, al fondo, tiene la opción "Cerrar sesión".
- **Dado** que elijo "Cerrar sesión" en la navegación del perfil, **cuando** el servidor cierra la sesión, **entonces** voy a `/` con el aviso "Cerraste sesión"; si falla, sigo en el perfil con el mensaje "No pudimos cerrar tu sesión" (igual que HU-05).
- **Dado** que la navegación solo tiene "Mi información", **cuando** abro `/perfil`, **entonces** voy directo a esa pestaña; cada pestaña futura tendrá su propia URL, así que recargar la página conserva la pestaña.
- **Dado** que escribo una dirección inexistente dentro del perfil (por ejemplo `/perfil/otra`), **cuando** se carga, **entonces** veo "Página no encontrada" dentro del perfil, con la navegación visible.
- **Dado** que soy Administrador, **cuando** abro el perfil por URL, **entonces** veo la página "Página no encontrada" y mi menú de cuenta no ofrece "Mi perfil": la navegación vertical del cliente no existe para administradores, que conservan solo su panel (HU-28).

### Ver los datos

- **Dado** que tengo la sesión iniciada, **cuando** entro a "Mi información", **entonces** veo mis datos personales con mis nombres, apellidos, teléfono y correo (solo lectura), y una sección de contraseña.
- **Dado** que no tengo sesión, **cuando** intento abrir el perfil, **entonces** soy llevado a iniciar sesión y, al lograrlo, vuelvo al perfil.
- **Dado** que mi cuenta se creó con Google y no tengo teléfono, **cuando** veo mis datos, **entonces** el teléfono aparece como no registrado, con la opción de agregarlo.
- **Dado** que abro el perfil, **cuando** el navegador aún no recibió mis datos, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.

### Editar datos básicos (diálogo propio)

- **Dado** que veo mis datos, **cuando** elijo "Editar datos", **entonces** se abre un diálogo con un formulario con mis nombres, apellidos y teléfono ya cargados. Los campos no se editan directamente sobre la pantalla.
- **Dado** que modifico los campos con valores válidos, **cuando** guardo, **entonces** los cambios se guardan, el diálogo se cierra, la pantalla muestra los valores nuevos, el nombre del header se actualiza y veo la notificación "Tus datos fueron actualizados".
- **Dado** que dejo vacío nombres, apellidos o teléfono, **cuando** intento guardar, **entonces** veo qué campo falta y no se envía la solicitud.
- **Dado** que escribo un teléfono que no tiene 9 dígitos o no empieza con 9, **cuando** intento guardar, **entonces** veo el mensaje de formato de HU-01 (9 dígitos, empieza con 9).
- **Dado** que abro el diálogo y no cambié nada, **cuando** intento guardar, **entonces** el botón "Guardar" está deshabilitado o el guardado no hace nada; no se avisa de una actualización inexistente.
- **Dado** que abro el diálogo y cambié campos, **cuando** lo cierro (Cancelar, Escape o tocar fuera), **entonces** no se guarda nada y al reabrirlo veo los valores guardados, no mis ediciones descartadas.
- **Dado** que el servidor rechaza o no responde al guardar, **cuando** envío el formulario, **entonces** el diálogo sigue abierto con mis ediciones y un mensaje de error ("No pudimos guardar tus datos, intenta de nuevo").

### Cambiar la contraseña (diálogo aparte)

- **Dado** que veo la sección de contraseña, **cuando** elijo "Cambiar contraseña", **entonces** se abre un diálogo distinto al de datos básicos, con los campos contraseña actual, nueva contraseña y confirmación de la nueva. Cambiar la contraseña no exige ni toca los datos básicos, y viceversa.
- **Dado** que escribo mi contraseña actual correcta, una nueva válida (mínimo 8 caracteres, una letra y un número, como HU-01) y su confirmación igual, **cuando** guardo, **entonces** mi contraseña se actualiza, el diálogo se cierra y veo la notificación "Tu contraseña fue actualizada".
- **Dado** que la contraseña actual es incorrecta, **cuando** guardo, **entonces** veo "La contraseña actual no es correcta" en ese campo, mi contraseña no cambia y el diálogo sigue abierto.
- **Dado** que la nueva contraseña no cumple las reglas o no coincide con su confirmación, **cuando** intento guardar, **entonces** veo qué falla y no se envía la solicitud.
- **Dado** que la nueva contraseña es igual a la actual, **cuando** intento guardar, **entonces** veo un mensaje indicando que debe ser distinta.
- **Dado** que cambié mi contraseña con éxito, **cuando** tenía sesiones abiertas en otros dispositivos, **entonces** esas sesiones se cierran (se invalidan sus refresh tokens, igual que HU-03), y la sesión desde donde cambié la contraseña sigue activa.
- **Dado** que cambié mi contraseña con éxito, **cuando** vuelvo a iniciar sesión, **entonces** la anterior ya no funciona y la nueva sí.
- **Dado** que fallo varias veces seguidas la contraseña actual, **cuando** intento otra vez, **entonces** el sistema me bloquea temporalmente con un mensaje de espera, como el login (HU-02).
- **Dado** que cierro el diálogo (Cancelar, Escape o tocar fuera), **cuando** lo reabro, **entonces** los campos están vacíos.

## Casos borde

- La pestaña "Mi información" es la única por ahora; la navegación no se pliega (a diferencia de la del panel) porque convive con el header y no tiene tanto contenido.

- El correo no es editable en esta historia: se muestra solo para referencia.
- Espacios al inicio o al final de nombres, apellidos y teléfono se ignoran, igual que en el registro (HU-01).
- Dos pestañas del navegador abiertas: si edito en una, la otra se actualiza la próxima vez que consulte el perfil; gana el último guardado.
- La sesión vence mientras tengo un diálogo abierto: se renueva sola (HU-04); si ya no se puede, soy llevado a iniciar sesión y se pierden las ediciones no guardadas.
- Cuenta de Google sin contraseña: ver la decisión "Cuentas de Google sin contraseña".
- Los datos del perfil que cambian no afectan pedidos ya hechos: estos conservan los datos con los que se hicieron (E4).

## Fuera de alcance

- Cambiar el correo, desvincular Google o eliminar la cuenta.
- Direcciones de entrega (HU-24), historial y seguimiento de pedidos (HU-25, HU-26) y repetir pedido (HU-27): son otras pestañas del perfil.
- Verificación del teléfono por SMS.
- Subir foto de perfil.
- Avisar por correo que la contraseña cambió.
- Ver o cerrar sesiones activas una por una.
- Edición de datos de administradores (HU-36).

## Decisiones de clarificación

- **Cuentas de Google sin contraseña**: el diálogo se titula "Crear contraseña" y pide solo la nueva y su confirmación, sin contraseña actual. Desde entonces la cuenta entra con ambos métodos y el diálogo pasa a ser "Cambiar contraseña" con contraseña actual.
- **Otras sesiones**: al cambiar o crear la contraseña se cierran las demás sesiones (refresh tokens revocados); la sesión actual sigue. Los `access_token` ya emitidos viven hasta 15 minutos, igual que en HU-05.
- **Contraseña actual incorrecta**: mismo límite que el login (3 intentos, bloqueo temporal de 15 minutos en Redis), contado por usuario y separado del contador del login (así quien robe una sesión no puede bloquear el inicio de sesión del dueño).
- **Ruta**: `/perfil` (redirige a `/perfil/mi-informacion`), con el header de la tienda y una navegación vertical propia. El menú de cuenta del header ofrece "Mi perfil" solo a Clientes.
- **Alcance**: la historia cubre al actor Cliente de punta a punta (backend y frontend), como las demás.
- **Administrador**: no usa `/perfil` (ve un 404 y su menú no ofrece "Mi perfil"); la API sí le sirve, para la sección "Mi información" de su panel (HU-36).
