# Plan: HU-35 — Conservar el carrito y la pantalla al iniciar sesión o registrarse

Requiere `spec.md` en estado Clarificada (sin preguntas abiertas).

## Backend

Sin cambios. No hay carrito en el servidor, por lo que no hay nada que fusionar ni endpoints nuevos.

## Frontend

Para el carrito no hay código nuevo: ningún flujo de auth toca el store. Se protege con pruebas de regresión. Para volver a la pantalla de origen sí hay código:

- **Origen**: el botón "Iniciar sesión" del `Header` navega a `/iniciar-sesion` con `state: { from: pathname + search }`.
- **`features/auth/return-path.ts`**:
  - `safeReturnPath` acepta solo rutas internas (empiezan con `/`, no con `//`, sin `\`) y rechaza las pantallas de autenticación; es el único punto de validación.
  - `returnPathFromState` lee `from` del estado del router.
  - `rememberReturnPath` y `takeReturnPath` guardan el origen en `sessionStorage` con marca de tiempo (10 min) para el viaje a Google, y `take` lo borra al leerlo.
- **`LoginPage` / `RegisterPage`**: tras el éxito navegan a `from ?? '/'` con `replace: true` y limpian lo guardado para Google; los enlaces "Regístrate" e "Inicia sesión" reenvían `state.from`.
- **`GoogleLoginButton`**: al hacer clic guarda `from` con `rememberReturnPath`. Google vuelve a `{frontend}/` (backend sin cambios).
- **`ReturnPathRedirect`** (en `Layout`): con sesión y en `/`, si hay origen guardado vigente navega a él con `replace`.
- **Cerrar sesión** no cambia: `navigate('/', { state: { loggedOut: true } })`.

Pruebas:
- `tests/features/auth/return-path.test.ts`: aceptación y rechazo de rutas, caducidad a 10 min, lectura única y contenido corrupto.
- `tests/features/auth/login-page.test.tsx` y `register-page.test.tsx`: vuelve al origen, sin origen o inseguro va a `/`, fallo no navega, los enlaces conservan el origen.
- `tests/components/header.test.tsx`: "Iniciar sesión" envía el origen con su búsqueda.
- `tests/components/return-path-redirect.test.tsx`: redirige con sesión en `/`, no consume sin sesión, ni actúa fuera de `/`.
- `tests/features/auth/components/google-login-button.test.tsx`: el clic guarda el origen y sin origen no guarda nada.

Pruebas a agregar, cada una con un carrito sembrado vía `useCartStore.setState` y comprobando que `items` queda igual:

- `tests/features/auth/login-page.test.tsx`: login exitoso con correo y contraseña; login fallido (credenciales inválidas).
- `tests/features/auth/register-page.test.tsx`: registro exitoso con sesión iniciada.
- `tests/components/header.test.tsx`: cerrar sesión con éxito y con error de red (el menú ya tiene pruebas de logout; se suma la aserción sobre el carrito y la insignia del header).
- `tests/context/auth-context.test.tsx`: restaurar la sesión con `me` exitoso y fallido (401) no cambia el carrito.
- Google: es una navegación completa a `googleLoginUrl`, no se simula en jsdom. Se cubre con la prueba de recarga de HU-16 (`rehydrate` conserva los ítems) y la verificación en navegador.

Los tests de auth ya mockean `@/features/auth/auth-api`; se importa `useCartStore` y se resetea en `beforeEach`, igual que `header.test.tsx`.

## Seguridad

- El origen es entrada no confiable (estado del router y `sessionStorage`): se valida con `safeReturnPath` para evitar redirecciones abiertas a otro dominio.
- El carrito sigue sin datos personales, por lo que cerrar sesión sin vaciarlo no expone nada sensible (spec).

## Decisiones

- **Sin fusión ni reset**: ningún flujo de auth llama a `clear()` ni a `importItems`; la prueba de regresión lo fija.
- **Cerrar sesión no vacía el carrito** (decisión del usuario).
- **Origen en estado del router, no en un parámetro de URL**: no queda en la barra de direcciones ni se puede compartir; para Google, donde se sale de la app, se usa `sessionStorage`. Se descartó cambiar el backend para pasar el origen por OAuth: exigiría validar la URL en el servidor y el `OAuth2SuccessHandler`.
- **`replace: true`** al volver, para que "atrás" no regrese al formulario.

## Impacto en docs/

- Ninguno.
