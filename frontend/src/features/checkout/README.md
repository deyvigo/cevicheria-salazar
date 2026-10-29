Checkout y pagos — épica [E4](../../../../docs/epicas.md#e4) (HU-17 a HU-22).

- `components/checkout-stepper.tsx`: `CheckoutStepper` y `CHECKOUT_STEPS`, indicador de los pasos de la compra (carrito, inicio de sesión, entrega, pago y listo). Recibe el paso actual por `id` y si hay sesión; con sesión omite "Inicio de sesión". Hoy solo lo usa `/cart`; las pantallas de cada paso lo reutilizarán.
- `delivery-step-page.tsx`: paso Entrega (`/checkout/direcciones`, HU-17). Elige Entrega (direcciones guardadas o una nueva con `AddressDialog`) o Recojo en tienda, y muestra el costo de delivery que calcula el backend; una dirección fuera de zona avisa que no hay cobertura. "Continuar" sigue deshabilitado hasta que exista el pago (HU-18).
- `checkout-guard.tsx`: la ruta solo se abre desde "Continuar" en `/cart`; acceso directo, recarga, visitante, carrito vacío o sesión expirada redirigen a `/cart`.
- `checkout-store.ts`: Zustand **sin persistencia** (`entered`, `deliveryType`, `selectedAddressId`); el carrito lo reinicia al montarse.
- `checkout-api.ts` / `use-delivery-cost.ts`: `GET /pedidos/costo-delivery?direccionId=`, sin caché (`gcTime: 0`) para usar siempre la tarifa vigente.
- `components/`: `delivery-type-selector`, `address-option-list` y `coverage-notice`.
