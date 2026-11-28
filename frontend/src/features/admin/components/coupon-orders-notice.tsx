import { couponOrdersNoticeText } from '@/features/admin/order-labels';
import { useCouponOrdersSummary } from '@/features/admin/use-admin-orders';

export function CouponOrdersNotice({ coupon }: { coupon: string }) {
  const { data } = useCouponOrdersSummary(coupon);
  const text = data ? couponOrdersNoticeText(data) : null;
  if (!text) return null;

  return (
    <p role="status" className="rounded-lg bg-info-surface px-4 py-3 text-body text-info-text">
      {text}
    </p>
  );
}
