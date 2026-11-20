import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelMyOrder } from '@/features/perfil/order-api';
import { MY_ORDERS_QUERY_KEY } from '@/features/perfil/use-my-orders';

export function useCancelMyOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelMyOrder(id),
    // Also on failure: a conflict means the restaurant already moved the order, so show what it is now
    onSettled: (_data, _error, id) =>
      Promise.all([
        client.invalidateQueries({ queryKey: MY_ORDERS_QUERY_KEY }),
        client.invalidateQueries({ queryKey: ['order', id] }),
      ]),
  });
}
