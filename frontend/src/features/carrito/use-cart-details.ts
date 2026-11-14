import { useEffect } from 'react';
import { useCartStore } from '@/features/carrito/cart-store';
import { computeOrderSummary } from '@/features/carrito/order-summary';
import { useCartProducts } from '@/features/carrito/use-cart-products';

// Shared by /cart and the header card so both show the same data and drop unavailable dishes the same way
export function useCartDetails() {
  const items = useCartStore((state) => state.items);
  const reconcile = useCartStore((state) => state.reconcile);
  const ids = items.map((item) => item.productId).sort((a, b) => a - b);
  const idsKey = ids.join(',');
  const query = useCartProducts(ids);

  useEffect(() => {
    if (!query.isSuccess || query.isFetching || query.isPlaceholderData) return;
    reconcile(idsKey.split(',').map(Number), query.data);
  }, [idsKey, query.data, query.isSuccess, query.isFetching, query.isPlaceholderData, reconcile]);

  const productsById = new Map((query.data ?? []).map((product) => [product.id, product]));
  const summary = computeOrderSummary(items, productsById);

  return { items, query, productsById, summary };
}
