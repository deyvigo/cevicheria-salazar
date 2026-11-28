# Spec: HU-43 — Gestionar los códigos de descuento desde el panel

**Épica**: [E6. Panel de administración](../../docs/epicas.md#e6)
**Estado**: Hecha

## Objetivo

Que el Administrador cree, edite, active o desactive y elimine (si nunca se usaron) los códigos de descuento (cupones) desde una sección **Cupones** del panel `/admin`, decidiendo cuántas veces puede usarlos cada persona y cuántos cupos hay en total, y viendo cuántos se usaron, sin tocar la base de datos a mano.

## Contexto (qué ya existe y qué falta)

- HU-42 creó la tabla `coupons` y la aplicación del cupón en el paso Pago del checkout. Cada cupón tiene: `code`, `discount_type` (`PERCENTAGE` o `FIXED`), `discount_value`, `min_subtotal`, `starts_at`, `ends_at`, `max_uses` (cupos totales), `max_uses_per_customer` (usos por persona) e `is_active`.
- HU-42 dejó la gestión desde el panel fuera de alcance: hoy los cupones solo existen como semilla de desarrollo (`R__sample_coupons.sql`) y en producción se insertan a mano.
- Los usos no se guardan en un contador: son los pedidos con ese cupón en `PENDIENTE_PAGO`, `PENDIENTE_COBRO` o `PAGADO` (índice `idx_orders_coupon_usage`). Esta historia los muestra con esa misma regla.
- Los pedidos guardan una copia del código (`orders.coupon_code`) y su descuento ya calculado, así que editar un cupón no cambia pedidos pasados.

## Actor(es)

Administrador con sesión iniciada. Visitante y Cliente no tienen acceso.

## Campos de un cupón

| Campo                  | Obligatorio | Regla                                                                                       |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| **Código**             | Sí          | Hasta 30 caracteres: letras, números, guiones (`-`) y guiones bajos (`_`), sin espacios. Se guarda en mayúsculas y sin espacios alrededor; único. Queda fijo en cuanto el cupón tiene un uso. |
| **Tipo de descuento**  | Sí          | Porcentaje o monto fijo.                                                                     |
| **Valor**              | Sí          | Mayor que 0; con porcentaje, hasta 100.                                                      |
| **Usos por persona**   | No          | Entero mayor que 0. Vacío = sin límite por persona.                                         |
| **Cupos**              | No          | Cuántos pedidos en total pueden usarlo hasta que se acabe. Entero mayor que 0. Vacío = sin límite. |
| **Activo**             | Sí          | Interruptor; un cupón inactivo no se puede aplicar en el checkout. Por defecto, activo.     |
| **Compra mínima**      | No (opcional) | Subtotal de platos mínimo en soles.                                                          |
| **Vigencia**           | No (opcional) | Fecha de inicio y de fin; si están las dos, el inicio es anterior al fin.                    |

## Criterios de aceptación

### Ver

- **Dado** que estoy en el panel, **cuando** miro la navegación, **entonces** veo la sección **Cupones** (`/admin/cupones`).
- **Dado** que abro `/admin/cupones`, **cuando** carga, **entonces** veo una tabla con **Código**, **Descuento** (`10 %` o `S/ 5.00`), **Usos por persona** (`1` o "Sin límite"), **Cupos** (usados / total, ej. `12 / 50`, o `12 / Sin límite`), **Vigencia**, **Activo** (interruptor) y **Acciones** ("Editar" y "Eliminar"), una fila por cupón, en el panel entre **Pedidos** y **Reportes**.
- **Dado** un cupón que llegó a su total de cupos, **cuando** lo veo en la tabla, **entonces** se marca como **Agotado**.
- **Dado** un cupón cuya vigencia terminó, **cuando** lo veo en la tabla, **entonces** se marca como **Vencido**.
- **Dado** que no hay cupones, **cuando** abro la sección, **entonces** veo "Aún no tienes cupones" con la opción de agregar uno.
- **Dado** que la sección aún no recibió los cupones, **cuando** la abro, **entonces** veo un estado de carga, y si falla, un mensaje con opción de reintentar.

### Crear y editar

- **Dado** que pulso "Agregar cupón", **cuando** completo los campos válidos y guardo, **entonces** el cupón aparece en la tabla y se puede aplicar en el checkout si está activo.
- **Dado** que escribo el código en minúsculas o con espacios alrededor, **cuando** guardo, **entonces** se guarda en mayúsculas y sin esos espacios.
- **Dado** un código que ya existe (sin distinguir mayúsculas), **cuando** guardo, **entonces** veo "Ya existe un cupón con este código" y no se guarda.
- **Dado** un código con espacios en medio u otros símbolos, un porcentaje mayor que 100, un valor 0 o negativo, usos o cupos que no son enteros positivos, o un inicio posterior al fin, **cuando** guardo, **entonces** veo el error bajo el campo y no se guarda.
- **Dado** que pulso "Editar" en un cupón, **cuando** cambio sus campos y guardo, **entonces** los cambios aplican a los pedidos que se creen desde ese momento; los pedidos anteriores conservan su descuento.
- **Dado** un cupón que todavía no se usó, **cuando** lo edito, **entonces** puedo cambiar también su código.
- **Dado** un cupón con al menos un uso, **cuando** lo edito, **entonces** el campo Código está deshabilitado con la ayuda "El código no se puede cambiar porque ya se usó"; si igual llega un cambio de código al servidor, se rechaza.
- **Dado** que dejo vacíos la compra mínima, la vigencia, los usos por persona o los cupos, **cuando** guardo, **entonces** el cupón se guarda sin ese límite.
- **Dado** un cupón con 12 usos, **cuando** intento bajar sus cupos a menos de 12, **entonces** veo "Ya se usó 12 veces: los cupos no pueden ser menos" y no se guarda.

### Activar y desactivar

- **Dado** un cupón activo, **cuando** apago su interruptor en la tabla, **entonces** queda inactivo y el checkout lo rechaza con "Este código no es válido", igual que en HU-42.
- **Dado** un cupón inactivo, **cuando** lo activo, **entonces** se puede volver a aplicar si sigue vigente y con cupos.

### Eliminar

- **Dado** un cupón que nunca se usó, **cuando** pulso "Eliminar", **entonces** veo un diálogo de confirmación ("¿Eliminar el cupón CEVICHE10? Esta acción no se puede deshacer.") y, al confirmar, desaparece de la tabla y el checkout ya no lo reconoce.
- **Dado** un cupón con al menos un uso, **cuando** miro su fila, **entonces** "Eliminar" está deshabilitado con la ayuda "Tiene pedidos asociados: desactívalo en su lugar"; si igual llega la eliminación al servidor, se rechaza con ese mensaje.
- Para **eliminar** y para **fijar el código**, "uso" es cualquier pedido que tenga el cupón, en cualquier estado (incluso uno cancelado), porque ese pedido guarda la referencia al cupón. Para los **cupos** de la tabla cuenta la regla de HU-42: solo pedidos en `PENDIENTE_PAGO`, `PENDIENTE_COBRO` o `PAGADO`. Por eso un cupón puede mostrar `0 / 50` y aun así no poder eliminarse.

## Casos borde

- **Cupón aplicado en un checkout abierto** cuando el administrador lo desactiva o lo agota: el backend lo vuelve a validar al crear el pedido (HU-42) y el cliente ve el mensaje correspondiente.
- **Cambiar el valor de un cupón** mientras un cliente lo tiene aplicado en el resumen: el pedido se crea con el valor vigente al pagar, porque el backend recalcula.
- **Usos por persona mayor que los cupos totales** (ej. 3 por persona y 2 cupos): se permite; manda el que se acabe primero.

## Fuera de alcance

- Ver qué pedidos o clientes usaron cada cupón: [HU-44](../hu-44-pedidos-por-cupon/spec.md).
- Cupones por plato o categoría, de envío gratis, combinables o asignados a un cliente concreto (como en HU-42).
- Layout para celular, igual que el resto del panel.

## Impacto en documentación

- `docs/historias.md`, `docs/epicas.md`: HU-43.
- `docs/diagrama-de-casos-de-uso.md`: el Administrador gestiona los cupones.
- `docs/diagrama-de-base-de-datos.md`: solo si cambia el modelo (no se espera).
- `specs/hu-42-cupones-de-descuento/`: la gestión desde el panel deja de estar pendiente.

## Decisiones de clarificación

- **Compra mínima y vigencia**: se incluyen en el formulario, como campos opcionales.
- **Eliminar**: solo cupones que nunca se usaron; los usados solo se desactivan.
- **Código**: editable hasta el primer uso; después queda fijo.
- **Navegación**: **Cupones** va entre **Pedidos** y **Reportes**.

## Preguntas abiertas

Ninguna.
