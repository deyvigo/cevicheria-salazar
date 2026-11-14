import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceAdminOrder, type AdminOrderRow } from '@/features/admin/admin-order-api';
import { ADMIN_ORDERS_KEY, patchOrderRow } from '@/features/admin/admin-orders-cache';

export function useAdvanceOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (row: AdminOrderRow) => advanceAdminOrder(row.id, row.deliveryStatus),
    onSuccess: (row) => patchOrderRow(client, row),
    // A conflict means another administrator moved it first: show what is there now
    onError: () => client.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY }),
  });
}
