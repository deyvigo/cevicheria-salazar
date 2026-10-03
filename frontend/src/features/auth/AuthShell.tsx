import type { ReactNode } from 'react';

interface AuthShellProps {
  /** Lado donde va la imagen en pantallas grandes. Login y registro usan lados opuestos. */
  imageSide: 'left' | 'right';
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
export function AuthShell({ imageSide, children }: AuthShellProps) {
  const clip = CLIP_PATHS[imageSide];

  return (
    <main className={`flex min-h-svh bg-bg ${imageSide === 'right' ? 'lg:flex-row-reverse' : ''}`}>
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <clipPath id={clip.id} clipPathUnits="objectBoundingBox">
            <path d={clip.d} />
          </clipPath>
        </defs>
      </svg>

      <div className="sticky top-0 hidden h-svh w-[55%] flex-none lg:block">
        <img
          src="/logo.jpg"
          alt=""
          className="h-full w-full object-cover"
          style={{ clipPath: `url(#${clip.id})` }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
    </main>
  );
}
