import type { ReactNode } from 'react';

interface AuthShellProps {
  /** Lado donde va la imagen en pantallas grandes. Login y registro usan lados opuestos. */
  imageSide: 'left' | 'right';
  /** Difumina la foto y muestra el logo arriba a la izquierda de la pantalla (solo login). */
  branded?: boolean;
  children: ReactNode;
}

// Diagonal curva sobre el borde interno de la imagen. `objectBoundingBox` hace que la
// forma escale con el panel; la versión derecha es el espejo exacto de la izquierda.
const CLIP_PATHS = {
  left: { id: 'auth-image-clip-left', d: 'M0,0 H1 Q0.9,0.5 0.78,1 H0 Z' },
  right: { id: 'auth-image-clip-right', d: 'M1,0 H0 Q0.1,0.5 0.22,1 H1 Z' },
} as const;

/**
 * Marco de las pantallas de acceso (login y registro): foto grande con borde diagonal a un
 * lado y el formulario centrado en el otro. En móvil la foto se oculta y queda solo el formulario.
 */
export function AuthShell({ imageSide, branded = false, children }: AuthShellProps) {
  const clip = CLIP_PATHS[imageSide];

  return (
    <main className={`relative flex min-h-svh bg-bg ${imageSide === 'right' ? 'lg:flex-row-reverse' : ''}`}>
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <clipPath id={clip.id} clipPathUnits="objectBoundingBox">
            <path d={clip.d} />
          </clipPath>
        </defs>
      </svg>

      <div className="sticky top-0 hidden h-svh w-[55%] flex-none lg:block">
        <div className="h-full w-full overflow-hidden" style={{ clipPath: `url(#${clip.id})` }}>
          <img
            src="/background.jpg"
            alt=""
            className={`h-full w-full object-cover ${branded ? 'scale-105' : ''}`}
          />
        </div>
      </div>

      {branded && (
        <img
          src="/logo.png"
          alt="Salazar"
          className={`absolute top-6 hidden h-60 w-60 object-contain lg:block ${imageSide === 'left' ? 'left-6' : 'right-6'}`}
        />
      )}

      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
    </main>
  );
}
