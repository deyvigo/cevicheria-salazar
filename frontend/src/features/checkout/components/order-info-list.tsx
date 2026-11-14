import type { ReactNode } from 'react';
import { formatDateTime } from '@/features/catalogo/format';
import type { Order } from '@/features/checkout/checkout-api';
import { PAYMENT_PENDING_TEXT, paymentMethodText, paymentStatusText } from '@/features/checkout/order-payment-text';
import { deliveryStatusLabel } from '@/features/perfil/delivery-status';

export function OrderInfoList({ order }: { order: Order }) {
  return (
    <dl className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
      {order.customerName ? <Item label="Nombre">{order.customerName}</Item> : null}
      <Item label="Estado del pago">{paymentStatusText(order)}</Item>
      <Item label="Estado de la entrega">{deliveryStatusLabel(order.deliveryStatus)}</Item>
      <Item label="Cómo lo recibirás">
        {order.deliveryType === 'RECOJO' || order.address === null ? (
          'Recojo en tienda'
        ) : (
          <>
            <span className="block">Entrega a domicilio</span>
            <span className="block text-ink-muted">
              {order.address.label}: {order.address.text}
            </span>
            {order.address.reference ? (
              <span className="block text-ink-muted">Referencia: {order.address.reference}</span>
            ) : null}
          </>
        )}
      </Item>
      <Item label="Cómo pagas">{paymentMethodText(order)}</Item>
      <Item label="Fecha de compra">{formatDateTime(order.purchasedAt)}</Item>
      <Item label="Fecha de pago">{order.paidAt ? formatDateTime(order.paidAt) : PAYMENT_PENDING_TEXT}</Item>
    </dl>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-base text-ink">{children}</dd>
    </div>
  );
}
