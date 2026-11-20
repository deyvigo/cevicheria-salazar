import { Button } from '@/components/button';
import type { AdminOrderRow } from '@/features/admin/admin-order-api';
import { primaryAction, secondaryActions, type OrderAction } from '@/features/admin/order-actions';

interface OrderActionsProps {
  order: AdminOrderRow;
  busy: boolean;
  onAction: (order: AdminOrderRow, action: OrderAction) => void;
}

export function OrderActions({ order, busy, onAction }: OrderActionsProps) {
  const primary = primaryAction(order);
  const secondary = secondaryActions(order);
  if (!primary && secondary.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {secondary.map((action) => (
        <Button
          key={action.to}
          variant="outline"
          disabled={busy}
          onClick={() => onAction(order, action)}
          className="min-h-10 px-4 whitespace-nowrap"
        >
          {action.label}
        </Button>
      ))}
      {primary ? (
        <Button
          variant={primary.needsCode ? 'primary' : 'secondary'}
          disabled={busy}
          onClick={() => onAction(order, primary)}
          className="min-h-10 px-4 whitespace-nowrap"
        >
          {primary.label}
        </Button>
      ) : null}
    </div>
  );
}
