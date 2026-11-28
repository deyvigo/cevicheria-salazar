import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCoupon,
  deleteCoupon,
  setCouponActive,
  updateCoupon,
  type CouponPayload,
} from '@/features/admin/admin-coupon-api';
import { ADMIN_COUPONS_QUERY_KEY } from '@/features/admin/use-admin-coupons';

function useInvalidateCoupons() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_COUPONS_QUERY_KEY });
}

export function useCreateCoupon() {
  const invalidate = useInvalidateCoupons();
  return useMutation({ mutationFn: (payload: CouponPayload) => createCoupon(payload), onSuccess: invalidate });
}

export function useUpdateCoupon() {
  const invalidate = useInvalidateCoupons();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CouponPayload }) => updateCoupon(id, payload),
    onSuccess: invalidate,
  });
}

export function useSetCouponActive() {
  const invalidate = useInvalidateCoupons();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setCouponActive(id, active),
    onSettled: invalidate,
  });
}

export function useDeleteCoupon() {
  const invalidate = useInvalidateCoupons();
  return useMutation({ mutationFn: (id: number) => deleteCoupon(id), onSuccess: invalidate });
}
