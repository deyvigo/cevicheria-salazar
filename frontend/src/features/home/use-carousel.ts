import { useCallback, useEffect, useState } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useCarousel(count: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  // Bumped on every manual pick so the timer restarts from zero
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const reducedMotion = useReducedMotion();
  const running = !paused && !held && !reducedMotion && count > 1;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % count), intervalMs);
    return () => clearTimeout(timer);
  }, [running, index, turn, count, intervalMs]);

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setTurn((current) => current + 1);
  }, []);

  const togglePaused = useCallback(() => setPaused((current) => !current), []);

  return { index, paused, reducedMotion, goTo, togglePaused, hold: setHeld };
}
