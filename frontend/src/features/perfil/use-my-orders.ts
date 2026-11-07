import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listMyOrders } from '@/features/perfil/order-api';

export const MY_ORDERS_QUERY_KEY = ['my-orders'] as const;

export function useMyOrders(page: number) {
  return useQuery({
    queryKey: [...MY_ORDERS_QUERY_KEY, page],
    queryFn: () => listMyOrders(page),
    placeholderData: keepPreviousData,
  });
}
