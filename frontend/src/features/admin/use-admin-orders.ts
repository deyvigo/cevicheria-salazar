import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getAdminOrder,
  getCouponOrdersSummary,
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

// Under the list key so the same live refresh that reloads the table recalculates it
export function useCouponOrdersSummary(coupon: string) {
  return useQuery({
    queryKey: [...ADMIN_ORDERS_LIST_KEY, 'coupon-summary', coupon],
    queryFn: () => getCouponOrdersSummary(coupon),
    enabled: coupon !== '',
  });
}

export function useAdminOrderZones() {
  return useQuery({ queryKey: [...ADMIN_ORDERS_KEY, 'zones'], queryFn: listAdminOrderZones });
}
