import { customerMessage } from '@/features/perfil/delivery-status';
import type { DeliveryStatus, OrderDeliveryType, RefundStatus } from '@/features/perfil/order-api';

interface NegativeStatusNoticeProps {
  status: DeliveryStatus;
  type: OrderDeliveryType;
  reason: string | null;
  refundStatus: RefundStatus | null;
  size?: 'sm' | 'lg';
}

export function NegativeStatusNotice({ status, type, reason, refundStatus, size = 'sm' }: NegativeStatusNoticeProps) {
  const large = size === 'lg';
  const detail = large ? 'text-body text-ink-muted' : 'text-body-sm text-ink-muted';

  return (
    <div className={`flex flex-col gap-1 text-center ${large ? '' : 'sm:max-w-44'}`}>
      <p className={`${large ? 'font-display text-title-md' : 'text-body-sm font-bold'} text-error-text`}>
        {customerMessage(status, type)}
      </p>
      {reason ? <p className={detail}>{reason}</p> : null}
      {refundStatus === 'PENDIENTE' ? <p className={detail}>Te devolveremos el pago</p> : null}
      {refundStatus === 'REEMBOLSADO' ? <p className={detail}>Pago reembolsado</p> : null}
    </div>
  );
}
