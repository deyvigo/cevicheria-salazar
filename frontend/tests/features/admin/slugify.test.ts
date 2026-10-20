import { describe, expect, it } from 'vitest';
import { slugify } from '@/features/admin/slugify';

describe('slugify', () => {
  it('pasa a minúsculas, quita tildes y usa guiones', () => {
    expect(slugify('Platos Fríos')).toBe('platos-frios');
    expect(slugify('Ñoquis y Pastá')).toBe('noquis-y-pasta');
  });

  it('convierte símbolos y espacios repetidos en un solo guion', () => {
    expect(slugify('Ceviches & Tiraditos!!  del   día')).toBe('ceviches-tiraditos-del-dia');
  });

  it('quita los guiones de los extremos', () => {
    expect(slugify('  --Postres--  ')).toBe('postres');
  });

  it('devuelve vacío si no queda nada utilizable', () => {
    expect(slugify('¡¿?!')).toBe('');
  });

  it('corta a 80 caracteres sin dejar un guion al final', () => {
    const slug = slugify(`${'a'.repeat(79)} bbb`);

    expect(slug).toBe('a'.repeat(79));
    expect(slugify('a'.repeat(100))).toHaveLength(80);
  });
});
