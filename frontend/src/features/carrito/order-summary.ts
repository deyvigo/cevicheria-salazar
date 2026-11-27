import type { CartItem } from '@/features/carrito/share-code';
import type { Product } from '@/features/catalogo/catalog-api';

export interface OrderSummary {
  subtotal: number;
  discount: number;
  total: number;
}

// null while any price is still unknown: a partial total would be wrong
export function computeOrderSummary(
  items: CartItem[],
  productsById: Map<number, Product>,
  discount = 0,
): OrderSummary | null {
  let subtotalCents = 0;
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) return null;
    // Sold-out dishes can't be bought, so they don't count toward what is paid
    if (!product.available) continue;
    // Integer cents avoid float drift such as 12.9 * 3 = 38.699999
    subtotalCents += Math.round(product.price * 100) * item.quantity;
  }
  const discountCents = Math.min(Math.round(discount * 100), subtotalCents);
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: (subtotalCents - discountCents) / 100,
  };
}
