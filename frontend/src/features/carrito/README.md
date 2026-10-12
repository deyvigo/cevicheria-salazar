Carrito de compras — épica [E3](../../../../docs/epicas.md#e3) (HU-12 a HU-16, HU-35).

Estado: `cart-store.ts` (Zustand + `persist` en `localStorage`, llave `salazar.carrito`). El carrito guarda solo `productId` y `quantity`; nombre, precio y stock se piden al servidor al abrir `/cart`. Enlace compartido: `share-code.ts`.

Cantidad (HU-13): `components/quantity-stepper.tsx` es el control −/campo/+ (el campo aplica al confirmar). `components/product-purchase.tsx` arma la zona de compra del detalle: control y botón "Agregar al carrito" fuera del carrito, solo el control (que edita el carrito) cuando el plato ya está. El store expone `setQuantity` y `remove`; `quantityCap` fija el tope (stock, máximo 99; un plato no pedible no puede crecer).
