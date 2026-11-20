import { formatDateTime } from '@/features/catalogo/format';
import type { Order } from '@/features/checkout/checkout-api';
import { InfoItem } from '@/features/checkout/components/order-info-list';
import { PAYMENT_PENDING_TEXT, paymentMethodText, paymentStatusText } from '@/features/checkout/order-payment-text';

export function OrderDetailInfo({ order }: { order: Order }) {
  const pickup = order.deliveryType === 'RECOJO' || order.address === null;

  return (
    <dl className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
      <InfoItem label="Cómo lo recibes">
        {pickup ? (
          'Recojo en tienda'
        ) : (
          <>
            <span className="block">Entrega a domicilio</span>
            <span className="block text-ink-muted">
              {order.address?.label}: {order.address?.text}
            </span>
            {order.address?.reference ? (
              <span className="block text-ink-muted">Referencia: {order.address.reference}</span>
            ) : null}
          </>
        )}
      </InfoItem>
      <InfoItem label="Cómo pagas">
        <span className="block">{paymentMethodText(order)}</span>
        <span className="block text-ink-muted">{paymentStatusText(order)}</span>
      </InfoItem>
      <InfoItem label="Fecha de compra">{formatDateTime(order.purchasedAt)}</InfoItem>
      <InfoItem label="Fecha de pago">{order.paidAt ? formatDateTime(order.paidAt) : PAYMENT_PENDING_TEXT}</InfoItem>
    </dl>
  );
}
