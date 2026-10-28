Checkout y pagos — épica [E4](../../../../docs/epicas.md#e4) (HU-17 a HU-22).

- `components/checkout-stepper.tsx`: `CheckoutStepper` y `CHECKOUT_STEPS`, indicador de los pasos de la compra (carrito, inicio de sesión, entrega, pago y listo). Recibe el paso actual por `id` y si hay sesión; con sesión omite "Inicio de sesión". Hoy solo lo usa `/cart`; las pantallas de cada paso lo reutilizarán.
