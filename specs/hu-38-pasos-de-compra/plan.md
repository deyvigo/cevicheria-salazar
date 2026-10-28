# Plan: HU-38 — Ver los pasos de la compra en el carrito

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios.

## Frontend

### Componente (`features/checkout/components/checkout-stepper.tsx`)

Vive en `checkout` porque lo reutilizarán las pantallas de E4; `cart-page.tsx` lo importa desde ahí.

- `CHECKOUT_STEPS`: arreglo constante con `id` (`'cart' | 'login' | 'delivery' | 'payment' | 'done'`), `title` y `description` de los cinco pasos (único lugar donde cambian los textos).
- `CheckoutStepper({ currentStep, isAuthenticated })`: `currentStep` es un `id`. Filtra el paso `login` cuando `isAuthenticated` es `true` y numera los restantes desde 1 por su posición.
- Es puro y no llama a `useAuth`: la página le pasa `isAuthenticated`, lo que lo mantiene fácil de probar.
- Estructura: `<nav aria-label="Pasos de la compra">` con una `<ol>`; cada `<li>` es un círculo con el número, el título y la descripción. El paso actual lleva `aria-current="step"`.
- La línea entre pasos se dibuja como conector entre círculos (borde de ancho flexible), sin elementos interactivos.
- Estilos con tokens: contenedor `bg-surface border-border rounded-lg shadow-sm`; círculo actual `bg-action` con texto en contraste; círculos neutros `bg-surface-disabled text-ink`; título `text-ink`, descripción `text-ink-muted`; línea `bg-border`. Se revisa en `tokens.json` el token y el contraste exacto del texto sobre `action`.
- Sin estado ni efectos: componente puro.

### Carrito (`cart-page.tsx`)

- Lee `const { user, isLoading } = useAuth()`.
- Se renderiza `<CheckoutStepper currentStep="cart" isAuthenticated={user !== null} />` entre el encabezado (título y "Compartir") y el grid, solo en la rama con platos y sin error, y solo si `!isLoading`. En las ramas de carrito vacío y de error no aparece.
- No toca el store, las consultas ni el foco. Al iniciar o cerrar sesión, `useAuth` cambia y el indicador se recalcula solo.

### Componentes del design system

Superficie de `Card` y tokens de `tokens.json` tal cual. No hay componente nuevo en el design system.

## Seguridad

Solo lee si hay sesión (`useAuth`), sin llamadas nuevas ni datos del usuario en pantalla. La sesión real se valida en el backend; el indicador es solo presentación.

## Decisiones

- **`currentStep` por `id`** y no por número: la numeración cambia según la sesión, el `id` no.
- **`isAuthenticated` como prop** y no `useAuth` dentro: el componente no depende del contexto y se prueba sin proveedor.
- **Sin indicador mientras `isLoading`**, en lugar de un esqueleto, para no mostrar un conjunto de pasos que luego cambie.
- **Componente en `checkout/`**, no en `carrito/`, por ser compartido por la épica E4.
- **El enlace compartido no lleva el paso**: `buildShareUrl` ya genera `/cart?c=...`, que es el primer paso; no se toca. Las historias de E4 no deben añadir el paso a ese enlace.
- **Sin rutas ni botón "Continuar"**: pertenecen a las historias de cada paso.

## Impacto en docs/

- `frontend/src/features/checkout/README.md`: mencionar `CheckoutStepper` y `CHECKOUT_STEPS`.
- `docs/`: ya actualizado con el alta de HU-38; sin cambios de arquitectura ni modelo de datos.
