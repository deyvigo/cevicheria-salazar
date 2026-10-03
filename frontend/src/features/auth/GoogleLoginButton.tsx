import { googleLoginUrl } from '@/lib/api';

/**
 * No es una llamada de axios: es un enlace normal a
 * `GET /oauth2/authorization/google` (navegación completa de página). Mismo
 * componente en /registro y /iniciar-sesion — es una sola acción, no dos.
 */
export function GoogleLoginButton() {
  return (
    <a
      href={googleLoginUrl}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-6 text-base font-bold text-ink hover:bg-surface-celeste focus-visible:shadow-focus focus-visible:outline-none"
    >
      Continuar con Google
    </a>
  );
}
