# Spec: HU-36 — Ver y editar mis datos personales (Administrador)

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador pueda ver y actualizar sus datos básicos (nombres, apellidos y teléfono) y cambiar su contraseña desde el panel `/admin`, igual que el Cliente lo hace en su perfil (HU-23), para mantener su cuenta al día y segura sin tocar la configuración del servidor.

## Contexto (qué ya existe y qué falta)

- HU-23 construyó, para el Cliente, la pestaña "Mi información": una pantalla con los datos y la contraseña, un diálogo para editar los datos básicos y otro, aparte, para cambiar la contraseña. La API (`PUT /api/perfil` y `PUT /api/perfil/contrasena`) hoy responde `403` a un Administrador, y `/perfil` le muestra un 404.
- La cuenta de administrador nace de la configuración del backend (HT-11), con un correo, una contraseña inicial y, opcionalmente, nombre y teléfono tomados de `application.yml`. Hoy no hay forma de cambiarlos desde la aplicación: la contraseña inicial queda como la definitiva.
- El panel `/admin` (HU-28) tiene su propia navegación vertical a toda la altura (Platos, Categorías, Pedidos, Reportes), sin el header de la tienda.
- Esta historia **no crea pantallas ni reglas nuevas**: pone en el panel lo que HU-23 ya resolvió, reutilizando su pantalla, sus diálogos y su API.

## Actor(es)

Administrador con la sesión iniciada (HU-28). Visitantes y Clientes no tienen acceso.

## Criterios de aceptación

### Navegación

- **Dado** que estoy en el panel, **cuando** miro la navegación vertical, **entonces** veo, como **última opción de la lista de secciones** (después de Reportes), una nueva sección **Mi información** con su ícono, igual de estilo que las demás; "Cerrar sesión" sigue separada, al fondo de la barra, y no se agrupa con ella; al elegirla llego a `/admin/mi-informacion`, y la sección queda resaltada con `aria-current="page"`.
- **Dado** que estoy en `/admin/mi-informacion`, **cuando** miro la pantalla, **entonces** no aparece el header de la tienda (el panel no lo tiene) y la navegación del panel sigue visible, plegable y con "Cerrar sesión" al fondo, como en las otras secciones.
- **Dado** que recargo la página en `/admin/mi-informacion`, **cuando** vuelve a cargar, **entonces** sigo en la misma sección con la sesión conservada.
- **Dado** que no soy Administrador (Visitante o Cliente), **cuando** abro `/admin/mi-informacion`, **entonces** veo el mismo 404 de todo `/admin` (HU-28).
- **Dado** que soy Administrador, **cuando** abro `/perfil` (el perfil del Cliente), **entonces** sigo viendo el 404 y el menú de cuenta de la tienda no ofrece "Mi perfil": mi equivalente es la sección del panel.

### Ver los datos

- **Dado** que abro "Mi información", **entonces** veo mis nombres, apellidos, teléfono y correo (solo lectura), con la misma presentación de HU-23, y una sección de contraseña con el botón "Cambiar contraseña".
- **Dado** que mi cuenta se creó sin teléfono, **cuando** veo mis datos, **entonces** el teléfono aparece como "No registrado", con la opción de agregarlo al editar.
- **Dado** que los datos aún no llegan o fallan, **cuando** abro la sección, **entonces** veo un estado de carga o un mensaje con opción de reintentar, como en HU-23.

### Editar datos básicos (diálogo propio)

- **Dado** que veo mis datos, **cuando** elijo "Editar datos", **entonces** se abre un diálogo con nombres, apellidos y teléfono cargados, con exactamente el mismo comportamiento y las mismas validaciones, mensajes y notificaciones de HU-23 (campos obligatorios, teléfono de 9 dígitos que empiece con 9, "Guardar" deshabilitado sin cambios, descartar al cerrar, error de servidor sin perder lo escrito, "Tus datos fueron actualizados").
- **Dado** que guardo con éxito, **cuando** el diálogo se cierra, **entonces** la pantalla muestra los valores nuevos sin recargar.

### Cambiar la contraseña (diálogo aparte)

- **Dado** que elijo "Cambiar contraseña", **cuando** se abre el diálogo, **entonces** es independiente del de datos básicos y pide contraseña actual, nueva y confirmación, con las mismas reglas, mensajes y límites de HU-23 (mínimo 8 caracteres con letras y números, coincidencia, distinta de la actual, contraseña actual incorrecta en su campo, bloqueo temporal tras 3 intentos fallidos, campos vacíos al reabrir, "Tu contraseña fue actualizada").
- **Dado** que cambio mi contraseña con éxito, **cuando** tenía sesiones abiertas en otros dispositivos, **entonces** esas sesiones se cierran y la sesión actual sigue activa.
- **Dado** que cambié mi contraseña con éxito, **cuando** vuelvo a iniciar sesión, **entonces** la anterior ya no funciona y la nueva sí; cambiarla en la aplicación es independiente de la contraseña inicial de `application.yml`, que solo se usa para crear la cuenta si no existe ningún administrador.

### Protección

- **Dado** que no tengo sesión, **cuando** llamo a `PUT /api/perfil` o `PUT /api/perfil/contrasena`, **entonces** responden `401`.
- **Dado** que soy Administrador desactivado (`is_active = false`) o mi sesión venció mientras la sección estaba abierta, **cuando** intento guardar, **entonces** pierdo el acceso como en el resto del panel (HU-28).
- **Dado** que soy Administrador o Cliente, **cuando** llamo a esos endpoints, **entonces** solo puedo modificar mi propia cuenta: el usuario sale de la sesión, nunca del cuerpo de la solicitud.

## Casos borde

- Todos los de HU-23 (espacios en los textos, dos pestañas abiertas, sesión que vence con un diálogo abierto) aplican igual.
- El correo no es editable: es la credencial del login y de la cuenta por defecto (HT-11); cambiarlo queda fuera.
- Al reiniciar el backend, la cuenta por defecto **no se vuelve a crear ni se pisa** con los datos de `application.yml` si ya existe un administrador (comportamiento de HT-11): lo editado aquí se conserva.
- Un Cliente al que se le cambia el rol a Administrador (o al revés) con la sesión viva: la API valida el usuario en cada petición, así que sigue la regla del rol vigente en la base de datos.

## Fuera de alcance

- Cambiar el correo, desactivar o eliminar cuentas de administrador, o crear otros administradores.
- Gestión de otros usuarios desde el panel.
- Las secciones Platos, Categorías, Pedidos y Reportes (HU-29 a HU-34).
- Cualquier cambio visual o de comportamiento del perfil del Cliente (HU-23) más allá de reutilizar sus piezas.
- Verificación del teléfono, foto de perfil, aviso por correo del cambio de contraseña y ver o cerrar sesiones activas una por una (como en HU-23).

## Decisiones de clarificación

- **API**: el Administrador usa los mismos endpoints (`PUT /api/perfil` y `PUT /api/perfil/contrasena`). Se quita la restricción de rol de HU-23 (que respondía `403` a administradores) y se actualizan en el mismo cambio `specs/hu-23-datos-personales/` y sus tests. Las reglas (validaciones, intentos, cierre de otras sesiones) son idénticas y duplicarlas abriría dos formas de cambiar la misma contraseña.
- **Reutilización en el frontend**: la pantalla "Mi información" y sus dos diálogos de HU-23 se comparten tal cual entre `/perfil/mi-informacion` y `/admin/mi-informacion`; cada rama de rutas le pone su marco.
- **Posición en la navegación**: "Mi información" es la última opción de la lista de secciones, después de Reportes. "Cerrar sesión" queda separada, al fondo de la barra.
- **Menú de la tienda**: el Administrador sigue viendo en el header de la tienda solo "Panel de administración", sin "Mi perfil". `/perfil` sigue siendo un 404 para él.
