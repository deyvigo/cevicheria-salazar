# Tareas: HU-18 — Elegir el método de pago en el checkout

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Frontend

- [x] `checkout-store.ts`: agregar `paymentMethod` y `setPaymentMethod`; limpiar en `reset()` y al cambiar `deliveryType` — cubre: sin método preseleccionado, cambiar de método, conservar el método al volver — verificación: `tests/features/checkout/checkout-store.test.ts` — inicia en `null`; `setPaymentMethod` lo guarda; `reset` lo limpia; cambiar `deliveryType` lo limpia; no escribe en `localStorage`.
- [x] `CheckoutGuard` con exigencia de entrega válida para `/checkout/pago` y ruta en `router.tsx` — cubre: acceso directo, recarga, carrito vacío, sesión que expira — verificación: `tests/features/checkout/checkout-guard.test.tsx` — sin entrega válida (ni Recojo ni dirección) redirige a `/cart`; con Recojo o con dirección renderiza el hijo; carrito vacío redirige.
- [x] `delivery-step-page.tsx`: habilitar "Continuar" con selección válida y navegar a `/checkout/pago` — cubre: llegar al paso Pago, "Continuar" deshabilitado sin selección válida — verificación: `tests/features/checkout/delivery-step-page.test.tsx` — con Recojo habilitado; con dirección con cobertura y costo cargado habilitado; sin cobertura, calculando o con error deshabilitado; al elegirlo navega a `/checkout/pago`.
- [x] `payment-method-selector.tsx` — cubre: dos opciones, sin preselección, solo una a la vez, texto según tipo de entrega — verificación: `tests/features/checkout/components/payment-method-selector.test.tsx` — grupo de radios con Pago en línea y Contraentrega sin ninguno marcado; elegir uno desmarca el otro; con Entrega dice "al recibir" y con Recojo "al recoger".
- [x] `payment-step-page.tsx` (stepper en "Pago", selector, resumen con delivery, "Continuar" deshabilitado, "Volver") — cubre: estructura, resumen con Entrega y Recojo, Continuar y volver, stepper de cuatro/cinco pasos — verificación: `tests/features/checkout/payment-step-page.test.tsx` — Pago resaltado (tercero con sesión, cuarto si empezó sin sesión); con Entrega el delivery muestra la tarifa y el total la incluye; con Recojo `S/ 0.00`; esqueleto mientras carga el delivery y "Reintentar" si falla; "Continuar" siempre deshabilitado; "Volver" va a `/checkout/direcciones` conservando dirección y tipo de entrega.

## Documentación

- [x] Actualizar `docs/historias.md`, `docs/cronograma.md`, `specs/hu-17-direccion-checkout/spec.md` y `frontend/src/features/checkout/README.md` — cubre: impacto en documentación — verificación: revisión de los `.md` tocados.

## Verificación en navegador y cierre

- [x] Recorrer en navegador con `./scripts/dev.sh`: de `/cart` a Entrega con una dirección y con Recojo, "Continuar" al Pago, elegir cada método, volver y comprobar que se conservan dirección y método; abrir `/checkout/pago` por URL y recargar, y comprobar que redirige a `/cart` — cubre: acceso, selección y volver.
- [x] Probar casos borde: cambiar el carrito en otra pestaña, que expire la sesión, y que el administrador cambie la tarifa de la zona antes de entrar al pago — cubre: casos borde.
- [x] Revisar con teclado y lector de pantalla el grupo de radios del método de pago — cubre: accesibilidad.
- [x] Repasar cada criterio de `spec.md`, correr `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
