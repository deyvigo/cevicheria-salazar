import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getAdminOrder,
  listAdminOrders,
  listAdminOrderZones,
  type OrderListParams,
} from '@/features/admin/admin-order-api';
import { ADMIN_ORDER_DETAIL_KEY, ADMIN_ORDERS_KEY, ADMIN_ORDERS_LIST_KEY } from '@/features/admin/admin-orders-cache';

export function useAdminOrders(params: OrderListParams) {
  return useQuery({
    queryKey: [...ADMIN_ORDERS_LIST_KEY, params],
    queryFn: () => listAdminOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: number | null) {
  return useQuery({
    queryKey: [...ADMIN_ORDER_DETAIL_KEY, id],
    queryFn: () => getAdminOrder(id!),
    enabled: id !== null,
  });
}

export function useAdminOrderZones() {
  return useQuery({ queryKey: [...ADMIN_ORDERS_KEY, 'zones'], queryFn: listAdminOrderZones });
}
