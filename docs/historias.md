# Historias de usuario — App e-commerce Salazar SAC

Cada historia indica la épica a la que pertenece. Las épicas están descritas en [epicas.md](epicas.md).

<a id="e0"></a>

## [E0. Fundamentos del proyecto](epicas.md#e0)

Historias técnicas (HT): trabajo necesario para el proyecto que no entrega valor directo al cliente final.

| ID    | Historia técnica                                                                                                                    | Prioridad |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HT-01 | Elaborar el documento de visión y alcance del producto (objetivos, stakeholders, roles Scrum).                                      | Alta      |
| HT-02 | Levantar y validar requerimientos con Salazar SAC (pasarela de pagos, zonas de delivery, horario de atención, tipo de panel admin). | Alta      |
| HT-03 | Elaborar el Product Backlog inicial priorizado, la Definición de Listo (DoR) y la Definición de Hecho (DoD).                        | Alta      |
| HT-04 | Elaborar el diagrama de casos de uso.                                                                                               | Alta      |
| HT-05 | Elaborar el diagrama de arquitectura del sistema.                                                                                   | Alta      |
| HT-06 | Elaborar el modelo de base de datos (diagrama entidad-relación).                                                                    | Alta      |
| HT-07 | Elaborar el diagrama de despliegue.                                                                                                 | Alta      |
| HT-08 | Diseñar los prototipos de pantallas (wireframes) de los flujos principales.                                                         | Media     |
| HT-09 | Configurar el entorno: repositorio, estrategia de ramas, proyecto base y base de datos de desarrollo.                               | Alta      |

<a id="e1"></a>

## [E1. Autenticación y registro](epicas.md#e1)

| ID    | Historia de usuario                                                                                             | Prioridad |
| ----- | --------------------------------------------------------------------------------------------------------------- | --------- |
| HU-01 | Como visitante, quiero registrarme con mi correo, nombre, teléfono y contraseña para poder hacer pedidos.       | Alta      |
| HU-02 | Como cliente, quiero iniciar sesión con mi correo y contraseña para acceder a mi cuenta.                        | Alta      |
| HU-03 | Como cliente, quiero recuperar mi contraseña mediante mi correo para no perder acceso a mi cuenta.              | Media     |
| HU-04 | Como cliente, quiero mantener mi sesión iniciada para no tener que ingresar mis datos cada vez que abro la app. | Media     |
| HU-05 | Como cliente, quiero cerrar sesión para proteger mi cuenta si uso un dispositivo compartido.                    | Media     |
| HU-06 | Como visitante, quiero registrarme o iniciar sesión con Google para hacerlo más rápido.                         | Baja      |

<a id="e2"></a>

## [E2. Catálogo de productos](epicas.md#e2)

| ID    | Historia de usuario                                                                                                                        | Prioridad |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| HU-07 | Como cliente, quiero ver los platos organizados por categorías (ceviches, chicharrones, bebidas, etc.) para encontrar rápido lo que busco. | Alta      |
| HU-08 | Como cliente, quiero ver el detalle de un plato (foto, descripción, precio) para decidir si lo pido.                                       | Alta      |
| HU-09 | Como cliente, quiero buscar platos por nombre para encontrarlos sin recorrer todo el catálogo.                                             | Media     |
| HU-10 | Como cliente, quiero saber si un plato está agotado o no disponible para no intentar pedirlo.                                              | Alta      |
| HU-11 | Como cliente, quiero ver las promociones o platos destacados para aprovechar ofertas.                                                      | Baja      |

<a id="e3"></a>

## [E3. Carrito de compras](epicas.md#e3)

El carrito no requiere cuenta. El inicio de sesión se exige recién al realizar el pedido (ver [E4](#e4)).

| ID    | Historia de usuario                                                                                                                                   | Prioridad |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HU-12 | Como visitante, quiero agregar platos al carrito para armar mi pedido.                                                                                | Alta      |
| HU-13 | Como visitante, quiero modificar la cantidad o eliminar platos del carrito para ajustar mi pedido.                                                    | Alta      |
| HU-14 | Como visitante, quiero ver el subtotal, el costo de delivery y el total para saber cuánto voy a pagar.                                                | Alta      |
| HU-15 | Como visitante, quiero agregar una nota a un plato (por ejemplo, "sin ají") para personalizar mi pedido.                                              | Media     |
| HU-16 | Como visitante, quiero que mi carrito se conserve si cierro la app, aunque no haya iniciado sesión, para no perder mi selección.                      | Alta      |
| HU-35 | Como visitante, quiero que los productos de mi carrito se mantengan al iniciar sesión o registrarme, para no perder mi selección al momento de pagar. | Alta      |

<a id="e4"></a>

## [E4. Checkout y pagos](epicas.md#e4)

| ID    | Historia de usuario                                                                                                                  | Prioridad |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| HU-17 | Como cliente, quiero seleccionar o ingresar la dirección de entrega para recibir mi pedido en el lugar correcto.                     | Alta      |
| HU-18 | Como cliente, quiero elegir entre pago en línea o contraentrega para pagar de la forma que prefiera.                                 | Alta      |
| HU-19 | Como cliente, quiero pagar con tarjeta a través de la pasarela de pagos para completar mi pedido en línea.                           | Alta      |
| HU-20 | Como cliente, quiero indicar si pagaré en efectivo (y con cuánto) o con POS/Yape al recibir, para que el repartidor venga preparado. | Alta      |
| HU-21 | Como cliente, quiero recibir una confirmación con el número de pedido para tener constancia de mi compra.                            | Alta      |
| HU-22 | Como cliente, quiero que se me informe si el pago fue rechazado para intentarlo de nuevo o cambiar de método.                        | Alta      |

<a id="e5"></a>

## [E5. Perfil del cliente](epicas.md#e5)

| ID    | Historia de usuario                                                                                                                | Prioridad |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HU-23 | Como cliente, quiero ver y editar mis datos personales para mantenerlos actualizados.                                              | Media     |
| HU-24 | Como cliente, quiero guardar varias direcciones de entrega para no escribirlas en cada pedido.                                     | Media     |
| HU-25 | Como cliente, quiero ver el historial de mis pedidos para revisar lo que he comprado.                                              | Media     |
| HU-26 | Como cliente, quiero ver el estado de mi pedido actual (recibido, en preparación, en camino, entregado) para saber cuándo llegará. | Alta      |
| HU-27 | Como cliente, quiero repetir un pedido anterior para ahorrar tiempo.                                                               | Baja      |

<a id="e6"></a>

## [E6. Panel de administración](epicas.md#e6)

| ID    | Historia de usuario                                                                                                              | Prioridad |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HU-28 | Como administrador, quiero iniciar sesión en el panel con un rol de administrador para gestionar el negocio de forma segura.     | Alta      |
| HU-29 | Como administrador, quiero crear, editar y eliminar platos (con foto, precio y categoría) para mantener el catálogo actualizado. | Alta      |
| HU-30 | Como administrador, quiero marcar platos como disponibles o agotados para reflejar el stock del día.                             | Alta      |
| HU-31 | Como administrador, quiero gestionar las categorías del catálogo para organizar la carta.                                        | Media     |
| HU-32 | Como administrador, quiero ver los pedidos entrantes en tiempo real para prepararlos a tiempo.                                   | Alta      |
| HU-33 | Como administrador, quiero cambiar el estado de un pedido para que el cliente vea su avance.                                     | Alta      |
| HU-34 | Como administrador, quiero ver un reporte de ventas por día y por método de pago para controlar los ingresos.                    | Baja      |
