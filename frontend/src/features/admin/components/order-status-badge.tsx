import type { DeliveryStatus } from '@/features/admin/admin-order-api';
import { DELIVERY_LABELS } from '@/features/admin/order-labels';

const CLASSES: Record<DeliveryStatus, string> = {
  EN_PREPARACION: 'bg-warning-surface text-warning-text',
  EN_CAMINO: 'bg-info-surface text-info-text',
  ENTREGADO: 'bg-success-surface text-success-text',
};

export function OrderStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap ${CLASSES[status]}`}>
      {DELIVERY_LABELS[status]}
    </span>
  );
}
