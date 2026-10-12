import { describe, expect, it } from 'vitest';
import { computeOrderSummary } from '@/features/carrito/order-summary';
import type { Product } from '@/features/catalogo/catalog-api';

const product = (id: number, price: number, available = true): Product => ({
  id,
  name: `Plato ${id}`,
  description: '',
  price,
  rating: null,
  imageUrl: null,
  available,
  stock: 10,
});

const byId = (...products: Product[]) => new Map(products.map((p) => [p.id, p]));

describe('computeOrderSummary', () => {
  it('suma precio por cantidad y agrega el delivery', () => {
    const summary = computeOrderSummary(
      [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
      byId(product(1, 32), product(2, 18.5)),
    );

    expect(summary).toEqual({ subtotal: 82.5, discount: 0, delivery: 5, total: 87.5 });
  });

  it('no arrastra errores de coma flotante', () => {
    const summary = computeOrderSummary([{ productId: 1, quantity: 3 }], byId(product(1, 12.9)));

    expect(summary?.subtotal).toBe(38.7);
    expect(summary?.total).toBe(43.7);
  });

  it('no suma los platos agotados', () => {
    const summary = computeOrderSummary(
      [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 4 },
      ],
      byId(product(1, 20), product(2, 10, false)),
    );

    expect(summary?.subtotal).toBe(20);
  });

  it('con todos agotados cobra solo el delivery', () => {
    const summary = computeOrderSummary([{ productId: 1, quantity: 2 }], byId(product(1, 20, false)));

    expect(summary).toEqual({ subtotal: 0, discount: 0, delivery: 5, total: 5 });
  });

  it('devuelve null si falta algún plato por cargar', () => {
    const summary = computeOrderSummary(
      [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ],
      byId(product(1, 20)),
    );

    expect(summary).toBeNull();
  });
});
