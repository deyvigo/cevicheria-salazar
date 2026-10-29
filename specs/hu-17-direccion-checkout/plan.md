# Plan: HU-17 — Seleccionar la dirección de entrega en el checkout

`spec.md` en estado Clarificada.

## Backend

### Endpoint

`GET /api/pedidos/costo-delivery?direccionId={id}` (cliente con sesión).

Respuesta `200`:

```json
{ "covered": true, "price": 8.00, "zone": "Miraflores" }
{ "covered": false, "price": 0.00, "zone": null }
```

- `404` si la dirección no existe, está eliminada o no es del cliente (`AddressNotFoundException`, el mismo que HU-24, para no revelar direcciones ajenas); `400` si falta `direccionId`; `401`/`403` igual que `/api/perfil/direcciones` (sin sesión o administrador).
- Una dirección sin cobertura **no** es un error: devuelve `200` con `covered: false` y `price: 0`.
- El costo se calcula siempre en el servidor con las coordenadas guardadas; el cliente solo manda el id.

### Capas (paquete `pedidos`)

- **Controlador** `DeliveryCostController`: lee `Authentication` con `AuthenticatedUser.id(...)` como `AddressController` y delega.
- **Servicio** `DeliveryCostService.calculate(userId, addressId)` (`@Transactional(readOnly = true)`): obtiene la dirección del cliente y consulta la zona. Para no duplicar la regla de propiedad, `AddressService.find` (hoy privado) pasa a un método público `getOwned(userId, id)` (y `AuthenticatedUser` pasa a ser público para que `pedidos` lo use) que valida cliente activo y dirección propia; el servicio nuevo lo usa.
- **Repositorio** `DeliveryZoneRepository.findCheapestCovering(lng, lat)`: consulta nativa

  ```sql
  SELECT * FROM delivery_zones
  WHERE active AND ST_Covers(area, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
  ORDER BY price ASC, id ASC
  LIMIT 1
  ```

  `ST_Covers` (no `ST_Contains`) cuenta como dentro un punto sobre el borde del polígono; el orden por tarifa y `id` fija el desempate de zonas superpuestas (la menor) de forma determinista. Usa el índice GIST de `area`.
- **DTO** `DeliveryCostResponse(boolean covered, BigDecimal price, String zone)`.
- Las coordenadas se pasan como `longitud, latitud` (orden de `ST_MakePoint`), igual que los polígonos de HU-37.

### Base de datos

Sin migraciones ni tablas nuevas. Usa `addresses` y `delivery_zones` tal cual.

## Frontend

### Ruta y acceso

- Ruta `/checkout/direcciones` bajo `Layout` en `router.tsx`, envuelta por `CheckoutGuard`.
- **Flujo secuencial con estado en memoria**: `features/checkout/checkout-store.ts` (Zustand, **sin** `persist`) guarda `entered` (se llegó con "Continuar"), `deliveryType` (`'delivery' | 'pickup'`, por defecto `'delivery'`) y `selectedAddressId`. Al recargar o abrir la URL el store nace vacío y el guard redirige. Se descarta `location.state` porque el historial del navegador lo conserva al recargar y dejaría entrar.
- `CheckoutGuard` (`features/checkout/checkout-guard.tsx`): mientras `useAuth().isLoading` no renderiza nada; si no hay sesión, `entered` es falso o el carrito está vacío, `<Navigate to="/cart" replace />`. Si la sesión expira con la pantalla abierta, `user` pasa a `null` y el guard redirige solo.
- `cart-page.tsx`: "Continuar" llama `enter(startedAsVisitor)` del store; con sesión navega a `/checkout/direcciones` y sin ella a `/iniciar-sesion` con `from: '/checkout/direcciones'`, de modo que el login devuelve directo al paso Entrega. El store guarda `startedAsVisitor` y la pantalla pasa `isAuthenticated = user !== null && !startedAsVisitor` al stepper, que así mantiene los cinco pasos; el carrito, al montarse, llama `reset()` para que volver con "atrás" y avanzar con "adelante" no salte el paso.

### Pantalla `features/checkout/delivery-step-page.tsx`

- Estructura: `CheckoutStepper currentStep="delivery"`, columna izquierda con el selector y columna derecha con el resumen (misma grilla que `/cart`).
- **Componentes de feature** en `features/checkout/components/`:
  - `delivery-type-selector.tsx`: dos opciones (`role="radiogroup"` con `radio`s) Entrega / Recojo en tienda.
  - `address-option-list.tsx`: con Entrega, una tarjeta seleccionable por dirección (`role="radio"`, nombre, dirección, referencia) y al final la opción "Agregar nueva dirección". Estados de carga y error con "Reintentar".
  - `coverage-notice.tsx`: aviso "Tu dirección no está en cobertura" con la indicación de elegir otra o recoger en tienda.
- **Datos**: `useAddresses()` de `perfil` (misma clave `['addresses']`) para la lista; `checkout-api.ts` (`getDeliveryCost(addressId)`) y `use-delivery-cost.ts`: `useQuery` con clave `['delivery-cost', addressId]`, `enabled` solo con Entrega y dirección elegida, `staleTime: 0` y `gcTime: 0` para que cada selección use la tarifa vigente y nunca muestre el valor de otra dirección.
- **Agregar dirección**: reutiliza `AddressDialog` de `perfil`. Su callback `onSaved` pasa a recibir también la dirección creada, `onSaved(message, address)` (compatible: `my-addresses-page` ignora el segundo argumento); la pantalla la selecciona. El dialog invalida `['addresses']`, así que la lista ya la incluye.
- **Selección limpia**: si la dirección seleccionada ya no está en la lista cargada (eliminada), se limpia `selectedAddressId`.
- **Resumen**: `components/order-summary.tsx` (carrito) pasa a aceptar `delivery?: number | 'loading'` (la fila "Delivery" solo se muestra si se pasa; con `'loading'` muestra un esqueleto y el total se oculta) y `children` en lugar de `onContinue`, para que cada pantalla ponga su botón. `cart-page.tsx` pasa su botón "Continuar" como hijo. El total de la pantalla es `summary.total + delivery`; `computeOrderSummary` no cambia.
- **Botones**: "Continuar" siempre `disabled` (HU-18 no existe) y "Volver al carrito" (`Link` a `/cart`, que además hace `reset()` por el efecto de montaje del carrito).
- **Textos**: español, tuteo, sin emojis; precios con `formatPrice`.

### Componentes del design system

`Button`, `Card` (superficie de las tarjetas de dirección), `Dialog` (vía `AddressDialog`) y `Notification`/tokens de `tokens.json`. El estado seleccionado de una tarjeta usa los mismos tokens que el paso actual del stepper (`bg-action`/borde de acción); no hay componente nuevo en el design system.

## Seguridad

- Solo clientes con sesión; el administrador recibe `403`. La propiedad de la dirección se valida en el servidor (otro cliente → `404`).
- El cliente nunca envía precios ni coordenadas: solo el id; el costo mostrado es informativo. Al crear el pedido (HU-21) se recalcula con este mismo servicio.
- `direccionId` es un `Long`: si falta o no es numérico responde `400`, y un id inexistente o no positivo responde `404`; la consulta usa parámetros enlazados (sin concatenar SQL).
- El guard del frontend es solo UX: el endpoint está protegido por sí mismo.

## Decisiones

- **Endpoint en `pedidos`** y no en `perfil`: el costo de delivery es regla del checkout/pedido, aunque lea direcciones.
- **`ST_Covers`** para que el borde cuente como dentro (spec, casos borde).
- **Menor tarifa en zonas superpuestas** (decisión de clarificación), resuelta en SQL con `ORDER BY price, id`.
- **Estado del checkout en Zustand sin persistencia**, por la decisión de la spec; coherente con el store del carrito y sin librerías nuevas.
- **`gcTime: 0`** en la consulta del costo: evita mostrar el valor cacheado de otra dirección y respeta "tarifa vigente".
- **`OrderSummary` con `children`** en lugar de un botón fijo, porque el botón y su estado difieren entre `/cart` y esta pantalla.
- **Sin migraciones**: nada se guarda hasta HU-21.

## Impacto en docs/

- `docs/diagrama-de-arquitectura.md`: el servicio de checkout calcula el delivery con una consulta PostGIS a `delivery_zones` (HU-17).
- `docs/diagrama-de-base-de-datos.md`: sin cambios (en `delivery_zones` se actualiza solo la nota de que la historia de cálculo ya la consume).
- `docs/historias.md` / `docs/cronograma.md`: estado de HU-17.
- `frontend/src/features/checkout/README.md` y `frontend/src/features/carrito/README.md`: pantalla, store, guard y nuevo contrato de `OrderSummary`.
