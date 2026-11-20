import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changeAdminOrderStatus, refundAdminOrder, type AdminOrderRow, type DeliveryStatus } from '@/features/admin/admin-order-api';
import { ADMIN_ORDERS_KEY, patchOrderRow } from '@/features/admin/admin-orders-cache';

export interface ChangeStatusInput {
  order: AdminOrderRow;
  to: DeliveryStatus;
  reason?: string;
  deliveryCode?: string;
}

export function useChangeOrderStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ order, to, reason, deliveryCode }: ChangeStatusInput) =>
      changeAdminOrderStatus(order.id, order.deliveryStatus, to, { reason, deliveryCode }),
    onSuccess: (row) => patchOrderRow(client, row),
    // A conflict means another administrator moved it first: show what is there now
    onError: () => client.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY }),
  });
}

export function useRefundOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (order: AdminOrderRow) => refundAdminOrder(order.id),
    onSuccess: (row) => patchOrderRow(client, row),
    onError: () => client.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY }),
  });
}
