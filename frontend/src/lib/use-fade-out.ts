import { useEffect, useRef, useState } from 'react';

export const FADE_OUT_MS = 250;

/** Lets a row fade out before it is removed; with reduced motion there is no fade, so it is removed at once. */
export function useFadeOut() {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function start(onDone: () => void) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onDone();
    } else {
      setLeaving(true);
      timer.current = setTimeout(onDone, FADE_OUT_MS);
    }
  }

  return { leaving, start };
}
