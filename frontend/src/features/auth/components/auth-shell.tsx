import type { ReactNode } from 'react';

interface AuthShellProps {
  imageSide: 'left' | 'right';
  branded?: boolean;
  children: ReactNode;
}

// objectBoundingBox makes the diagonal scale with the panel; right is the mirror of left
const CLIP_PATHS = {
  left: { id: 'auth-image-clip-left', d: 'M0,0 H1 Q0.9,0.5 0.78,1 H0 Z' },
  right: { id: 'auth-image-clip-right', d: 'M1,0 H0 Q0.1,0.5 0.22,1 H1 Z' },
} as const;

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

      <div className="fixed inset-0 lg:hidden" aria-hidden="true">
        <img src="/background.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-ink/45 to-transparent to-40%" />
      </div>

      {branded && (
        <img
          src="/logo.png"
          alt="Salazar"
          className="absolute top-8 left-1/2 h-28 w-28 -translate-x-1/2 object-contain drop-shadow-lg lg:hidden"
        />
      )}

      <div className="sticky top-0 hidden h-svh w-[55%] flex-none lg:block">
        <div className="h-full w-full overflow-hidden" style={{ clipPath: `url(#${clip.id})` }}>
          <img src="/background.jpg" alt="" className={`h-full w-full object-cover ${branded ? 'scale-105' : ''}`} />
        </div>
      </div>

      {branded && (
        <img
          src="/logo.png"
          alt="Salazar"
          className={`absolute top-6 hidden h-60 w-60 object-contain lg:block ${imageSide === 'left' ? 'left-6' : 'right-6'}`}
        />
      )}

      <div className="relative flex flex-1 flex-col justify-end pt-40 lg:items-center lg:justify-center lg:p-6">
        <div className="flex w-full flex-col items-center rounded-t-xl bg-surface px-5 pt-3 pb-6 shadow-lg lg:w-auto lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-4 h-1 w-9 rounded-full bg-border lg:hidden" aria-hidden="true" />
          {children}
        </div>
      </div>
    </main>
  );
}
