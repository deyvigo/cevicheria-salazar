import { describe, expect, it } from 'vitest';
import { buildShareUrl, decodeCart, encodeCart } from '@/features/carrito/share-code';

const b64 = (text: string) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('share-code', () => {
  it('produce siempre el mismo código para el mismo carrito, sin importar el orden', () => {
    const a = encodeCart([
      { productId: 12, quantity: 2 },
      { productId: 7, quantity: 1 },
    ]);
    const b = encodeCart([
      { productId: 7, quantity: 1 },
      { productId: 12, quantity: 2 },
    ]);

    expect(a).toBe(b);
    expect(a).toBe(b64('7:1,12:2'));
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('decodifica lo que codifica', () => {
    const items = [
      { productId: 3, quantity: 5 },
      { productId: 40, quantity: 1 },
    ];

    expect(decodeCart(encodeCart(items))).toEqual({ ok: true, items });
  });

  it.each(['', '***', 'no es base64', b64('hola mundo'), b64('')])('rechaza el código ilegible %j', (code) => {
    expect(decodeCart(code)).toEqual({ ok: false });
  });

  it('descarta solo los ítems inválidos y vale la primera aparición de un id repetido', () => {
    const result = decodeCart(b64('1:2,2:0,abc,3:x,1:9,4:3,-5:1'));

    expect(result).toEqual({
      ok: true,
      items: [
        { productId: 1, quantity: 2 },
        { productId: 4, quantity: 3 },
      ],
    });
  });

  it('recorta cantidades enormes a 99 y limita a 100 platos', () => {
    expect(decodeCart(b64('1:500'))).toEqual({ ok: true, items: [{ productId: 1, quantity: 99 }] });

    const many = Array.from({ length: 150 }, (_, i) => `${i + 1}:1`).join(',');
    const result = decodeCart(b64(many));
    expect(result.ok && result.items).toHaveLength(100);
  });

  it('arma el enlace con el origen y devuelve null si pasa de 2000 caracteres', () => {
    const url = buildShareUrl([{ productId: 1, quantity: 2 }]);
    expect(url).toBe(`${window.location.origin}/cart?c=${b64('1:2')}`);

    const huge = Array.from({ length: 100 }, (_, i) => ({ productId: 900_000_000_000_000 + i, quantity: 99 }));
    expect(buildShareUrl(huge)).toBeNull();
  });
});
