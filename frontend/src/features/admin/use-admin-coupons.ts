import { useQuery } from '@tanstack/react-query';
import { listAdminCoupons } from '@/features/admin/admin-coupon-api';

export const ADMIN_COUPONS_QUERY_KEY = ['admin', 'coupons'] as const;

export function useAdminCoupons() {
  return useQuery({ queryKey: ADMIN_COUPONS_QUERY_KEY, queryFn: listAdminCoupons });
}
