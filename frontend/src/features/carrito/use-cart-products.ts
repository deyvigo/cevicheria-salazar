import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getProductsByIds } from '@/features/carrito/cart-api';

export function useCartProducts(ids: number[]) {
  return useQuery({
    queryKey: ['catalog', 'cart-products', ids.join(',')],
    queryFn: () => getProductsByIds(ids),
    enabled: ids.length > 0,
    // Stock and price must be current every time the cart is opened
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
  });
}
