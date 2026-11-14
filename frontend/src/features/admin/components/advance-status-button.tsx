import { Button } from '@/components/button';
import type { AdminOrderRow } from '@/features/admin/admin-order-api';
import { ADVANCE_LABELS } from '@/features/admin/order-labels';

interface AdvanceStatusButtonProps {
  order: AdminOrderRow;
  busy: boolean;
  onAdvance: (order: AdminOrderRow) => void;
}

export function AdvanceStatusButton({ order, busy, onAdvance }: AdvanceStatusButtonProps) {
  if (order.deliveryStatus === 'ENTREGADO') return null;
  return (
    <Button
      variant={order.deliveryStatus === 'EN_CAMINO' ? 'primary' : 'secondary'}
      disabled={busy}
      onClick={() => onAdvance(order)}
      className="min-h-10 px-4 whitespace-nowrap"
    >
      {ADVANCE_LABELS[order.deliveryStatus]}
    </Button>
  );
}
