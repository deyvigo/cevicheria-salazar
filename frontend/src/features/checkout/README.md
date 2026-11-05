Checkout y pagos — épica [E4](../../../../docs/epicas.md#e4) (HU-17 a HU-22).

- `components/checkout-stepper.tsx`: `CheckoutStepper` y `CHECKOUT_STEPS`, indicador de los pasos de la compra (carrito, inicio de sesión, entrega, pago y listo). Recibe el paso actual por `id` y si hay sesión; con sesión omite "Inicio de sesión". Hoy solo lo usa `/cart`; las pantallas de cada paso lo reutilizarán.
- `delivery-step-page.tsx`: paso Entrega (`/checkout/direcciones`, HU-17). Elige Entrega (direcciones guardadas o una nueva con `AddressDialog`) o Recojo en tienda, y muestra el costo de delivery que calcula el backend; una dirección fuera de zona avisa que no hay cobertura. "Continuar" se habilita con Recojo en tienda o con una dirección con cobertura y lleva al paso Pago.
- `payment-step-page.tsx`: paso Pago (`/checkout/pago`, HU-18). Elige Pago en línea o Contraentrega (sin preselección), y muestra el resumen con el delivery recalculado. "Continuar" sigue deshabilitado hasta que existan el cobro (HU-19) y el detalle de contraentrega (HU-20).
- `checkout-guard.tsx`: la ruta solo se abre desde "Continuar" en `/cart`; acceso directo, recarga, visitante, carrito vacío o sesión expirada redirigen a `/cart`. Con `requireDelivery` (paso Pago) exige además Recojo en tienda o una dirección elegida.
- `checkout-store.ts`: Zustand **sin persistencia** (`entered`, `deliveryType`, `selectedAddressId`, `paymentMethod`; cambiar el tipo de entrega limpia el método); el carrito lo reinicia al montarse.
- `checkout-api.ts` / `use-delivery-cost.ts`: `GET /pedidos/costo-delivery?direccionId=`, sin caché (`gcTime: 0`) para usar siempre la tarifa vigente.
- `components/`: `delivery-type-selector`, `address-option-list`, `coverage-notice`, y `payment-method-selector`.
