import type { AdminCoupon } from '@/features/admin/admin-coupon-api';

export function couponOf(overrides: Partial<AdminCoupon> = {}): AdminCoupon {
  return {
    id: 1,
    code: 'CEVICHE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minSubtotal: 30,
    maxUses: 50,
    maxUsesPerCustomer: 1,
    startsOn: null,
    endsOn: null,
    active: true,
    uses: 12,
    hasOrders: true,
    exhausted: false,
    expired: false,
    ...overrides,
  };
}
