# Plan: HU-18 — Elegir el método de pago en el checkout

`spec.md` en estado Clarificada.

## Backend

Sin cambios. Esta historia solo guarda la elección en el estado del checkout del frontend; el backend la recibe recién al crear el pedido (HU-19/HU-21), donde valida el método y recalcula los importes.

## Frontend

### Ruta y acceso

- Ruta `/checkout/pago` bajo `Layout` en `router.tsx`, envuelta por el mismo `CheckoutGuard` de HU-17.
- El guard exige además una entrega válida: `deliveryType === 'pickup'`, o `'delivery'` con `selectedAddressId`. Si falta, redirige a `/cart`. Así una recarga (store vacío) nunca entra.
- `delivery-step-page.tsx`: "Continuar" se habilita cuando la selección es válida (Recojo, o dirección con cobertura y costo cargado) y navega a `/checkout/pago`. Se mantiene deshabilitado en sin cobertura, calculando o con error, como hoy.
- `checkout-store.ts` agrega `paymentMethod` (`'online' | 'cash_on_delivery' | null`, inicial `null`) y `setPaymentMethod`. Se limpia en `reset()` y al cambiar `deliveryType` (el texto de contraentrega depende del tipo, y se evita arrastrar una elección vieja). Sin `persist`.

### Pantalla `features/checkout/payment-step-page.tsx`

- Estructura igual a la de Entrega: `CheckoutStepper currentStep="payment"`, columna izquierda solo con el selector (sin dirección ni tipo de entrega) y derecha con el resumen.
- **Componentes de feature** en `features/checkout/components/`:
  - `payment-method-selector.tsx`: `role="radiogroup"` con dos `radio`s (Pago en línea, Contraentrega), una tarjeta cada uno; el texto de Contraentrega depende de `deliveryType`.
- **Delivery y total**: el costo viene de `useDeliveryCost(selectedAddressId)` (HU-17, con `gcTime: 0`), no se guarda en el store, para que siempre sea el vigente. Mientras carga se muestra el esqueleto de `OrderSummary` (`delivery="loading"`); si falla, mensaje con "Reintentar".
- **Botones**: "Continuar" siempre `disabled` (HU-19/HU-20 no existen) y "Volver" (`Link` a `/checkout/direcciones`, sin `reset()`).
- **Textos**: español, tuteo, sin emojis.

### Componentes del design system

`Button`, `Card` (superficie de las opciones) y tokens de `tokens.json`. La opción seleccionada usa el mismo estilo que las tarjetas de dirección de HU-17; no se crea componente nuevo en el design system. Extraer el estilo de tarjeta seleccionable compartido si ya hay duplicación entre `address-option-list.tsx` y el selector nuevo.

## Seguridad

- El método elegido en el frontend es solo UX: el backend vuelve a validarlo, junto con el stock, la cobertura y todos los importes, al crear el pedido.
- El guard es solo UX; los endpoints del pedido (HU-21) se protegen por sí mismos.
- No hay datos de tarjeta en la app: el pago en línea se hará por redirección a Mercado Pago (HU-19).

## Decisiones

- **Sin backend ni migraciones**: nada se persiste hasta que existe un pedido.
- **Delivery recalculado al entrar**, no copiado del paso anterior, para respetar la "tarifa vigente" de HU-17 si el administrador cambió la zona.
- **Método limpio al cambiar el tipo de entrega**: evita que quede seleccionado un método con un texto que ya no corresponde.
- **Continuar deshabilitado**: consistente con el avance incremental de HU-17.

## Impacto en docs/

- `docs/historias.md` y `docs/cronograma.md`: estado de HU-18.
- `specs/hu-17-direccion-checkout/spec.md`: nota de que "Continuar" ya navega al pago.
- `frontend/src/features/checkout/README.md`: pantalla, ruta y `paymentMethod`.
- Arquitectura, despliegue y base de datos: sin cambios (Mercado Pago se documenta en HU-19).
