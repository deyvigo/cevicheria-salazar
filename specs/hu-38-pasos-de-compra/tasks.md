# Tareas: HU-38 — Ver los pasos de la compra en el carrito

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

## Frontend

- [x] Crear `features/checkout/components/checkout-stepper.tsx` con `CHECKOUT_STEPS` y `CheckoutStepper` (prop `isAuthenticated`) — cubre: pasos en orden con número, título y descripción, paso de inicio de sesión condicional, numeración consecutiva, paso actual resaltado, otro paso actual, no interactivo, accesibilidad — verificación: `tests/features/checkout/components/checkout-stepper.test.tsx` — sin sesión y con `currentStep = 'cart'` muestra los cinco títulos y descripciones en orden numerados 1 a 5 y solo "Carrito de compras" tiene `aria-current="step"`; con `isAuthenticated` muestra cuatro pasos numerados 1 a 4 sin "Inicio de sesión" y Entrega es el 2; con `currentStep = 'delivery'` lo tiene solo "Entrega"; la navegación se llama "Pasos de la compra" y es una lista ordenada de cinco elementos; no hay enlaces ni botones.
- [x] Integrar el indicador en `cart-page.tsx` (`currentStep="cart"`, `isAuthenticated` desde `useAuth`, solo con platos, sin error y con la sesión ya verificada) — cubre: indicador visible bajo el título, pasos según sesión, sesión en verificación, carrito vacío, error de carga, carrito compartido — verificación: `tests/features/carrito/cart-page.test.tsx` — como visitante con platos se ven los cinco pasos con "Carrito de compras" actual; con sesión iniciada se ven cuatro, sin "Inicio de sesión"; mientras `isLoading` no se muestra el indicador; quitar el último plato lo oculta y muestra "Tu carrito está vacío"; con `query.isError` no hay indicador; abrir `/cart?c=...` lo muestra con los platos importados y en el primer paso; hacer clic en un paso no cambia nada.

## Documentación

- [x] Actualizar `frontend/src/features/checkout/README.md` (`CheckoutStepper`, `CHECKOUT_STEPS`) — cubre: impacto en documentación — verificación: revisión del `.md` tocado.

## Verificación en navegador y cierre

- [x] Recorrer `/cart` en navegador: como visitante ver cinco pasos con el 1 resaltado, iniciar sesión, volver a `/cart` y ver cuatro pasos; recargar con sesión y comprobar que no hay salto de cinco a cuatro; vaciar el carrito y ver que desaparece; forzar el error de carga y comprobar que no aparece; comprobar que el resumen sticky de HU-14 sigue funcionando — cubre: layout, carrito vacío, error.
- [x] Verificar que el enlace de "Compartir" no incluye el paso — cubre: enlace compartido siempre en el primer paso — verificación: `tests/features/carrito/share-code.test.ts` — la URL generada tiene ruta `/cart` y `c` como único parámetro.
- [x] Probar casos borde: ventana angosta (textos que se ajustan sin solaparse), carrito compartido por enlace, clic en los pasos — cubre: casos borde y no interactivo.
- [x] Revisar con teclado y lector de pantalla que se anuncia "Pasos de la compra", solo los pasos visibles y el paso actual — cubre: accesibilidad.
- [x] Repasar cada criterio de `spec.md`, correr `pnpm test --run` y `pnpm build` (sin cambios de backend) y pasar la spec a **Hecha** — cubre: cierre.
