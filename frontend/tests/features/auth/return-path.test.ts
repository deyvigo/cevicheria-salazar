import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rememberReturnPath, returnPathFromState, safeReturnPath, takeReturnPath } from '@/features/auth/return-path';

describe('safeReturnPath', () => {
  it.each(['/cart', '/menu?q=ceviche', '/menu/ceviches', '/products/12'])('acepta %s', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([
    ['otro origen', 'https://malo.com/cart'],
    ['ruta relativa al protocolo', '//malo.com/cart'],
    ['barra invertida', '/\\malo.com'],
    ['sin barra inicial', 'cart'],
    ['no es texto', { a: 1 }],
    ['la pantalla de inicio de sesión', '/iniciar-sesion'],
    ['el registro con parámetros', '/registro?x=1'],
    ['restablecer contraseña', '/restablecer-contrasena?token=abc'],
  ])('rechaza %s', (_name, value) => {
    expect(safeReturnPath(value)).toBeNull();
  });

  it('lee el origen del estado del router', () => {
    expect(returnPathFromState({ from: '/cart' })).toBe('/cart');
    expect(returnPathFromState(null)).toBeNull();
    expect(returnPathFromState({ from: '//malo.com' })).toBeNull();
  });
});

describe('rememberReturnPath y takeReturnPath', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('devuelve la ruta guardada una sola vez', () => {
    rememberReturnPath('/cart');

    expect(takeReturnPath()).toBe('/cart');
    expect(takeReturnPath()).toBeNull();
  });

  it('guardar null borra lo anterior', () => {
    rememberReturnPath('/cart');
    rememberReturnPath(null);

    expect(takeReturnPath()).toBeNull();
  });

  it('descarta una ruta guardada hace más de 10 minutos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'));
    rememberReturnPath('/cart');
    vi.setSystemTime(new Date('2026-10-12T10:11:00Z'));

    expect(takeReturnPath()).toBeNull();
  });

  it('ignora contenido corrupto o con una ruta insegura', () => {
    sessionStorage.setItem('salazar.return-path', '{no es json');
    expect(takeReturnPath()).toBeNull();

    sessionStorage.setItem('salazar.return-path', JSON.stringify({ path: '//malo.com', at: Date.now() }));
    expect(takeReturnPath()).toBeNull();
  });
});
