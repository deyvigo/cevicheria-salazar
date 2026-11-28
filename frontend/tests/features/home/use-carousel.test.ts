import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCarousel } from '@/features/home/use-carousel';

function mockReducedMotion(matches: boolean) {
  const listeners: (() => void)[] = [];
  const query = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.push(listener),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => query));
  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('useCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('avanza en cada intervalo y vuelve a la primera después de la última', () => {
    const { result } = renderHook(() => useCarousel(3, 6000));

    expect(result.current.index).toBe(0);
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(1);
    act(() => vi.advanceTimersByTime(6000));
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(0);
  });

  it('elegir una foto la muestra y reinicia el turno', () => {
    const { result } = renderHook(() => useCarousel(3, 6000));

    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.goTo(2));
    expect(result.current.index).toBe(2);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.index).toBe(2);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(0);
  });

  it('la pausa del usuario detiene el turno hasta reanudar', () => {
    const { result } = renderHook(() => useCarousel(3, 6000));

    act(() => result.current.togglePaused());
    expect(result.current.paused).toBe(true);
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.index).toBe(0);
    act(() => result.current.togglePaused());
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(1);
  });

  it('retener (cursor o foco) detiene el turno mientras dura', () => {
    const { result } = renderHook(() => useCarousel(3, 6000));

    act(() => result.current.hold(true));
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.index).toBe(0);
    act(() => result.current.hold(false));
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(1);
  });

  it('con movimiento reducido no avanza solo, y sigue el cambio de preferencia', () => {
    const motion = mockReducedMotion(true);
    const { result } = renderHook(() => useCarousel(3, 6000));

    expect(result.current.reducedMotion).toBe(true);
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.index).toBe(0);
    act(() => result.current.goTo(1));
    expect(result.current.index).toBe(1);

    act(() => motion.change(false));
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(2);
  });

  it('con una sola foto no hay turno', () => {
    const { result } = renderHook(() => useCarousel(1, 6000));

    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.index).toBe(0);
  });
});
