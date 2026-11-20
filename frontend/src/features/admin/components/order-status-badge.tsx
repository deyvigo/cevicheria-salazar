import type { DeliveryStatus } from '@/features/admin/admin-order-api';
import { DELIVERY_LABELS } from '@/features/admin/order-labels';

const NEUTRAL = 'bg-warning-surface text-warning-text';
const MOVING = 'bg-info-surface text-info-text';
const NEGATIVE = 'bg-error-surface text-error-text';

const CLASSES: Record<DeliveryStatus, string> = {
  PENDIENTE: NEUTRAL,
  CONFIRMADO: NEUTRAL,
  EN_PREPARACION: NEUTRAL,
  LISTO_PARA_RECOGER: MOVING,
  LISTO_PARA_ENVIO: MOVING,
  EN_CAMINO: MOVING,
  ENTREGADO: 'bg-success-surface text-success-text',
  RECHAZADO: NEGATIVE,
  CANCELADO: NEGATIVE,
  FALLIDO: NEGATIVE,
};

export function OrderStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap ${CLASSES[status]}`}>
      {DELIVERY_LABELS[status]}
    </span>
  );
}
