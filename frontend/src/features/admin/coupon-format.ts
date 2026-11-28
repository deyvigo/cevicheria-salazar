import type { AdminCoupon } from '@/features/admin/admin-coupon-api';
import { formatPrice } from '@/features/catalogo/format';

const UNLIMITED = 'Sin límite';

// The days are already Lima calendar days, so they are formatted in UTC to avoid shifting them
const DAY = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function formatDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

export function formatDiscount(coupon: Pick<AdminCoupon, 'discountType' | 'discountValue'>): string {
  return coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue} %` : formatPrice(coupon.discountValue);
}

export function formatPerCustomer(coupon: Pick<AdminCoupon, 'maxUsesPerCustomer'>): string {
  return coupon.maxUsesPerCustomer === null ? UNLIMITED : String(coupon.maxUsesPerCustomer);
}

export function formatSeatsTotal(coupon: Pick<AdminCoupon, 'maxUses'>): string {
  return coupon.maxUses === null ? UNLIMITED : String(coupon.maxUses);
}

export function formatValidity(coupon: Pick<AdminCoupon, 'startsOn' | 'endsOn'>): string {
  const { startsOn, endsOn } = coupon;
  if (startsOn && endsOn) return `${formatDay(startsOn)} – ${formatDay(endsOn)}`;
  if (startsOn) return `Desde ${formatDay(startsOn)}`;
  if (endsOn) return `Hasta ${formatDay(endsOn)}`;
  return 'Siempre';
}
