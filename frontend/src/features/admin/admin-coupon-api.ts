import { api } from '@/lib/api';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  // Days in Lima, YYYY-MM-DD; the end day is valid until its last minute
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
}

export interface AdminCoupon extends CouponPayload {
  id: number;
  // Orders still holding a seat (pending payment, pending collection or paid)
  uses: number;
  // Any order references the coupon, whatever its status: it can no longer be renamed or deleted
  hasOrders: boolean;
  exhausted: boolean;
  expired: boolean;
}

export async function listAdminCoupons(): Promise<AdminCoupon[]> {
  const { data } = await api.get<AdminCoupon[]>('/admin/coupons');
  return data;
}

export async function createCoupon(payload: CouponPayload): Promise<AdminCoupon> {
  const { data } = await api.post<AdminCoupon>('/admin/coupons', payload);
  return data;
}

export async function updateCoupon(id: number, payload: CouponPayload): Promise<AdminCoupon> {
  const { data } = await api.put<AdminCoupon>(`/admin/coupons/${id}`, payload);
  return data;
}

export async function setCouponActive(id: number, active: boolean): Promise<AdminCoupon> {
  const { data } = await api.patch<AdminCoupon>(`/admin/coupons/${id}/active`, { active });
  return data;
}

export async function deleteCoupon(id: number): Promise<void> {
  await api.delete(`/admin/coupons/${id}`);
}
