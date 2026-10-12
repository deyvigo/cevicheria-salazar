import type { CartItem } from '@/features/carrito/share-code';
import type { Product } from '@/features/catalogo/catalog-api';

// Flat fee until delivery zones are defined (HT-02)
export const DELIVERY_FEE = 5;
export const DISCOUNT = 0;

export interface OrderSummary {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
}

// null while any price is still unknown: a partial total would be wrong
export function computeOrderSummary(items: CartItem[], productsById: Map<number, Product>): OrderSummary | null {
  let subtotalCents = 0;
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) return null;
    // Sold-out dishes can't be bought, so they don't count toward what is paid
    if (!product.available) continue;
    // Integer cents avoid float drift such as 12.9 * 3 = 38.699999
    subtotalCents += Math.round(product.price * 100) * item.quantity;
  }
  const subtotal = subtotalCents / 100;
  return {
    subtotal,
    discount: DISCOUNT,
    delivery: DELIVERY_FEE,
    total: subtotal - DISCOUNT + DELIVERY_FEE,
  };
}
