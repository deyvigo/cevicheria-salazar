# Spec: HU-28 — Iniciar sesión como administrador y acceder al panel

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador inicie sesión en el mismo login que los clientes y llegue a un panel `/admin` con navegación vertical por secciones (Platos, Categorías, Pedidos, Reportes), protegido para que solo lo use quien tiene rol `ADMINISTRADOR`. Es la base de las historias HU-29 a HU-34, que llenan cada sección.

## Contexto (qué ya existe y qué falta)

- El login (HU-02) ya autentica a cualquier usuario activo y la sesión expone su `role` (`CLIENTE` | `ADMINISTRADOR`); la cuenta de administrador la crea el backend al arrancar (HT-11).
- Hoy el login siempre lleva al cliente a `/` (o a la ruta a la que intentaba entrar). No hay rutas `/admin` ni guardas por rol en el frontend ni en la API.
- La tienda comparte un `Layout` con el header superior (logo, buscador, carrito, cuenta). El panel no debe heredarlo.
- El menú de categorías del catálogo (`CategoryList`) es la referencia visual de los ítems de la navegación vertical: alto táctil, ítem activo resaltado y hover celeste. En el panel, la navegación ocupa toda la altura de la pantalla.

## Actor(es)

Administrador (cuenta con rol `ADMINISTRADOR`). También afecta a Visitante y Cliente, que no deben poder entrar al panel.

## Criterios de aceptación

### Acceso

- **Dado** que soy Administrador, **cuando** inicio sesión en el login normal con mis credenciales correctas, **entonces** llego al panel `/admin` en lugar de la tienda.
- **Dado** que soy Administrador y el login me llevó a una ruta guardada de la tienda (por ejemplo `/cart`), **cuando** inicio sesión, **entonces** igualmente llego a `/admin` (el rol manda sobre la ruta de retorno).
- **Dado** que soy Cliente, **cuando** inicio sesión, **entonces** el comportamiento no cambia respecto a HU-02 (llego a `/` o a la ruta a la que intentaba entrar).
- **Dado** que soy Administrador con la sesión ya iniciada (o restaurada por HU-04), **cuando** abro `/admin` directamente, **entonces** veo el panel sin volver a iniciar sesión.

### Protección

- **Dado** que no soy Administrador (Visitante sin sesión o Cliente), **cuando** abro cualquier ruta `/admin/...`, **entonces** la ruta se comporta como una ruta inexistente (404): no veo ningún contenido del panel ni se me redirige al login, y no se confirma que la ruta existe. El diseño de la página 404 es de otra historia; aquí solo se exige que no se muestre el panel.
- **Dado** que no soy Administrador, **cuando** llamo directamente a un endpoint de la API de administración, **entonces** la API responde "no autenticado" (sin sesión) o "prohibido" (Cliente) y no devuelve datos; la protección no depende solo de ocultar pantallas.
- **Dado** que mi cuenta de administrador fue desactivada (`is_active = false`) o mi sesión expiró mientras estaba en el panel, **cuando** realizo la siguiente acción, **entonces** pierdo el acceso y vuelvo al login.

### Panel y navegación

- **Dado** que estoy en cualquier ruta `/admin`, **cuando** veo la pantalla, **entonces** **no** aparece el header superior de la tienda (logo, buscador, carrito, cuenta): el panel tiene su propia estructura.
- **Dado** que estoy en el panel, **cuando** veo la pantalla, **entonces** hay una navegación vertical con las secciones **Platos**, **Categorías**, **Pedidos** y **Reportes**, ocupando toda la altura de la pantalla, con ítems como los del menú de categorías del catálogo (alto táctil, ítem activo resaltado y marcado con `aria-current="page"`). Arriba del todo muestra el título **Administrador**.
- **Dado** que soy Administrador, **cuando** abro `/admin`, **entonces** soy redirigido a `/admin/platos`, la primera sección, resaltada en la navegación.
- **Dado** que elijo una sección, **cuando** la selecciono, **entonces** la URL cambia (`/admin/platos`, `/admin/categorias`, `/admin/pedidos`, `/admin/reportes`), el ítem activo se resalta y el contenido de esa sección ocupa el área principal sin recargar la página.
- **Dado** que soy Administrador y abro `/admin/<sección inexistente>`, **cuando** carga, **entonces** veo un mensaje de página no encontrada dentro del panel (con la navegación visible).
- **Dado** que aún no se implementan las historias de cada sección (HU-29 a HU-34), **cuando** abro una sección, **entonces** veo un estado vacío con el nombre de la sección, sin datos simulados.
- **Dado** que estoy en el panel, **cuando** pulso el botón con ícono de ventana a la derecha del título, **entonces** la navegación se pliega a un ancho pequeño: desaparece el título y las etiquetas, y quedan solo el ícono de plegado y los íconos de cada ítem; al pulsarlo de nuevo se expande. Los ítems plegados conservan su nombre accesible.
- **Dado** que estoy en el panel, **cuando** quiero salir, **entonces** tengo una acción **Cerrar sesión** (HU-05) al final de la navegación vertical, no en un header.

## Casos borde

- Mismo mensaje genérico para credenciales inválidas, cuenta inexistente o inactiva que en HU-02: el login no revela si una cuenta es de administrador.
- Login con Google (HU-06): las cuentas creadas así son `CLIENTE`, por lo que nunca llegan al panel por esa vía.
- Cambio de rol mientras hay sesión: el rol que vale es el que el servidor valida en cada petición, no solo el que el frontend guardó al iniciar sesión.
- Administrador que visita la tienda (`/`, `/menu`, etc.) con sesión iniciada: puede hacerlo; el menú de cuenta del header de la tienda muestra la opción "Panel de administración".
- Recargar la página en una subruta (`/admin/pedidos`) mantiene la sección y la sesión.
- La ruta de retorno guardada para un Cliente nunca puede apuntar a `/admin`: si apunta, se ignora.

## Fuera de alcance

- Contenido y funcionalidad de cada sección (HU-29 a HU-34).
- Crear, editar o desactivar administradores, o roles/permisos más finos.
- Login separado para administradores o doble factor de autenticación.
- Forzar cambio de contraseña en el primer acceso (ya descartado en HT-11).
- Diseño de la página de error 404 (otra historia).
- Versión móvil del panel: no se considera; el panel se diseña solo para pantallas de escritorio.
- Notificaciones en tiempo real de pedidos (HU-32).

## Decisiones de clarificación

- **Móvil**: el panel no se diseña para móvil.
- **Acceso desde la tienda**: el menú de cuenta del header de la tienda muestra "Panel de administración" solo a administradores.
- **Sección inicial**: `/admin` redirige a `/admin/platos`.
- **No administradores**: solo los administradores entran a `/admin/...`; para cualquier otro (incluido un visitante sin sesión) la ruta responde como inexistente (404), sin redirigir al login. La página 404 se diseña en otra historia.
- **Cerrar sesión**: al final de la navegación vertical, separada de las cuatro secciones. No hay acción "Ir a la tienda" en el panel (se descartó); el administrador vuelve a la tienda por su URL.
- **Plegado**: botón con ícono de ventana junto al título; el estado de plegado no se conserva entre visitas.
