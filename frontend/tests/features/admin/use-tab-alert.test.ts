import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTabAlert } from '@/features/admin/use-tab-alert';

describe('useTabAlert', () => {
  beforeEach(() => {
    document.head.innerHTML = '<title>Salazar SAC</title><link rel="icon" href="/favicon.svg" />';
    // jsdom has no canvas
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = '';
  });

  it('pone el número de pedidos nuevos en el título y lo restaura al llegar a cero', () => {
    const { rerender } = renderHook(({ count }) => useTabAlert(count), { initialProps: { count: 0 } });
    expect(document.title).toBe('Salazar SAC');

    rerender({ count: 3 });
    expect(document.title).toBe('(3) Pedidos | Salazar SAC');

    rerender({ count: 4 });
    expect(document.title).toBe('(4) Pedidos | Salazar SAC');

    rerender({ count: 0 });
    expect(document.title).toBe('Salazar SAC');
  });

  it('deja el ícono original si el navegador no puede dibujar uno nuevo', () => {
    const { rerender } = renderHook(({ count }) => useTabAlert(count), { initialProps: { count: 0 } });

    rerender({ count: 2 });

    // Without a canvas the title still changes and the icon is left alone
    expect(document.querySelector('link[rel~="icon"]')?.getAttribute('href')).toBe('/favicon.svg');
  });
});
