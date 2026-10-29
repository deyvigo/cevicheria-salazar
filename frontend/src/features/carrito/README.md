Carrito de compras — épica [E3](../../../../docs/epicas.md#e3) (HU-12 a HU-16, HU-35).

Estado: `cart-store.ts` (Zustand + `persist` en `localStorage`, llave `salazar.carrito`). El carrito guarda solo `productId` y `quantity`; nombre, precio y stock se piden al servidor al abrir `/cart`. Enlace compartido: `share-code.ts`.

Cantidad (HU-13): `components/quantity-stepper.tsx` es el control −/campo/+ (el campo aplica al confirmar). `components/product-purchase.tsx` arma la zona de compra del detalle: control y botón "Agregar al carrito" fuera del carrito, solo el control (que edita el carrito) cuando el plato ya está. El store expone `setQuantity` y `remove`; `quantityCap` fija el tope (stock, máximo 99; un plato no pedible no puede crecer).

Resumen (HU-14): `order-summary.ts` calcula subtotal, descuento y total en céntimos enteros (`DISCOUNT = 0` es provisional hasta tener descuentos; el delivery se cobra en el paso de entrega); los platos agotados no suman y devuelve `null` mientras falte algún precio. `components/order-summary.tsx` lo muestra en la columna derecha de `/cart`, con el botón Continuar como hijo: `OrderSummary` acepta `delivery` opcional (número o `'loading'`) y `children`, y el paso Entrega (HU-17) lo reutiliza. "Continuar" lleva al visitante a iniciar sesión y al cliente a `/checkout/direcciones`.
