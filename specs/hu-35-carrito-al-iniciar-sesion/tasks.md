# Tareas: HU-35 — Conservar el carrito al iniciar sesión o registrarse

Requiere `plan.md`. Cada tarea indica qué criterio(s) de `spec.md` cubre y cómo se verifica.

- [x] Aserción de carrito intacto en `login-page.test.tsx` (login exitoso y fallido) — cubre: iniciar sesión con correo, inicio de sesión fallido — verificación: `pnpm test --run login-page`.
- [x] Aserción de carrito intacto en `register-page.test.tsx` (registro exitoso) — cubre: registrarme — verificación: `pnpm test --run register-page`.
- [x] Aserción de carrito intacto y de la insignia del header al cerrar sesión (éxito y error) en `header.test.tsx` — cubre: cerrar sesión no vacía el carrito — verificación: `pnpm test --run header`.
- [x] Aserción de carrito intacto al restaurar sesión (`me` exitoso y 401) en `auth-context.test.tsx` — cubre: sesión restaurada sola — verificación: `pnpm test --run auth-context`.
- [x] Prueba de que con carrito vacío, iniciar sesión no introduce platos — cubre: carrito vacío — verificación: `pnpm test --run login-page`.
- [x] Guardar y validar el origen: `return-path.ts`, el estado `from` desde `Header` y el reenvío entre login y registro — cubre: volver al origen al iniciar sesión y registrarse, origen inseguro, enlaces entre formularios — verificación: `return-path.test.ts`, `login-page.test.tsx`, `register-page.test.tsx`, `header.test.tsx`.
- [x] Volver al origen tras Google: guardar en `GoogleLoginButton` y `ReturnPathRedirect` en `Layout` — cubre: Google vuelve a la pantalla de origen, caducidad, sin almacenamiento — verificación: `google-login-button.test.tsx`, `return-path-redirect.test.tsx` y recorrido en navegador.
- [x] Recorrer en navegador con la semilla `dev`: armar un carrito, iniciar sesión con correo, registrarse con otra cuenta, entrar con Google (en `localhost`) y cerrar sesión, empezando cada vez desde `/cart` y desde un plato con búsqueda — cubre: Google, volver al origen, cerrar sesión va a `/`.
- [x] Repasar cada criterio de `spec.md`, correr `pnpm test --run` y `pnpm build`, y pasar la spec a **Hecha** — cubre: cierre.
