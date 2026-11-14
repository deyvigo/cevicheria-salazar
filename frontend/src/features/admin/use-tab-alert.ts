import { useEffect } from 'react';

const SIZE = 32;

// Draws the current icon with a red dot; falls back to the dot alone if the icon can't be loaded or drawn
function drawBadge(base: string | null, done: (url: string | null) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext?.('2d');
  if (!context) return done(null);

  const paintDot = () => {
    context.fillStyle = '#d93025';
    context.beginPath();
    context.arc(SIZE - 9, 9, 8, 0, Math.PI * 2);
    context.fill();
    done(canvas.toDataURL('image/png'));
  };
  if (!base) return paintDot();
  const image = new Image();
  image.onload = () => {
    context.drawImage(image, 0, 0, SIZE, SIZE);
    paintDot();
  };
  image.onerror = paintDot;
  image.src = base;
}

/** Puts the number of unseen orders in the tab title and a dot on its icon; restores both at zero. */
export function useTabAlert(count: number) {
  useEffect(() => {
    if (count === 0) return;
    const originalTitle = document.title;
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const originalHref = link?.href ?? null;
    let cancelled = false;

    document.title = `(${count}) Pedidos | ${originalTitle}`;
    if (link) {
      drawBadge(originalHref, (url) => {
        if (url && !cancelled) link.href = url;
      });
    }
    return () => {
      cancelled = true;
      document.title = originalTitle;
      if (link && originalHref) link.href = originalHref;
    };
  }, [count]);
}
