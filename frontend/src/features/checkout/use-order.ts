import { useQuery } from '@tanstack/react-query';
import { getOrder } from '@/features/checkout/checkout-api';

export const ORDER_POLL_MS = 3000;

export function useOrder(id: number | null, keepPolling: boolean) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id as number),
    enabled: id !== null,
    retry: false,
    // The provider's notification may arrive after the customer is back, so a pending order is re-read for a while
    refetchInterval: (query) => (keepPolling && query.state.data?.status === 'PENDIENTE_PAGO' ? ORDER_POLL_MS : false),
  });
}
