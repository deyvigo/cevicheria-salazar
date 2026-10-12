Carrito de compras — épica [E3](../../../../docs/epicas.md#e3) (HU-12 a HU-16, HU-35).

Estado: `cart-store.ts` (Zustand + `persist` en `localStorage`, llave `salazar.carrito`). El carrito guarda solo `productId` y `quantity`; nombre, precio y stock se piden al servidor al abrir `/cart`. Enlace compartido: `share-code.ts`.
