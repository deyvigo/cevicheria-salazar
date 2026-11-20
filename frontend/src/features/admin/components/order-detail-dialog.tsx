import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import type { AdminOrderRow } from '@/features/admin/admin-order-api';
import { OrderActions } from '@/features/admin/components/order-actions';
import { OrderStatusBadge } from '@/features/admin/components/order-status-badge';
import type { OrderAction } from '@/features/admin/order-actions';
import {
  formatDateTime,
  PAYMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentOf,
  TYPE_LABELS,
} from '@/features/admin/order-labels';
import { useAdminOrder } from '@/features/admin/use-admin-orders';
import { formatPrice } from '@/features/catalogo/format';

interface OrderDetailDialogProps {
  orderId: number | null;
  open: boolean;
  busyId: number | null;
  onClose: () => void;
  onAction: (order: AdminOrderRow, action: OrderAction) => void;
  onRefund: (order: AdminOrderRow) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-base">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

export function OrderDetailDialog({ orderId, open, busyId, onClose, onAction, onRefund }: OrderDetailDialogProps) {
  const { data, isPending, isError, refetch } = useAdminOrder(orderId);
  const order = data?.order;

  return (
    <Dialog open={open && orderId !== null} title={order ? `Pedido ${order.code}` : 'Pedido'} onClose={onClose} wide>
      {isPending ? <p className="text-base text-ink-muted">Cargando el pedido...</p> : null}
      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar el pedido.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {data && order ? (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-2">
            <Row label="Fecha">{formatDateTime(order.purchasedAt)}</Row>
            <Row label="Cliente">{order.customerName}</Row>
            <Row label="Teléfono">{data.customerPhone}</Row>
            <Row label="Tipo">{TYPE_LABELS[order.deliveryType]}</Row>
            {data.addressText ? <Row label="Dirección">{data.addressText}</Row> : null}
            {data.addressReference ? <Row label="Referencia">{data.addressReference}</Row> : null}
            {order.zoneName ? <Row label="Zona">{order.zoneName}</Row> : null}
            <Row label="Pago">
              {PAYMENT_LABELS[paymentOf(order)]} ({PAYMENT_STATUS_LABELS[order.paymentStatus]})
            </Row>
            {data.cashAmount !== null ? <Row label="Paga con">{formatPrice(data.cashAmount)}</Row> : null}
            {order.cashChange !== null ? <Row label="Vuelto">{formatPrice(order.cashChange)}</Row> : null}
            <Row label="Entrega">
              <OrderStatusBadge status={order.deliveryStatus} />
            </Row>
            {order.deliveryReason ? <Row label="Motivo">{order.deliveryReason}</Row> : null}
            {order.refundStatus ? (
              <Row label="Reembolso">{order.refundStatus === 'PENDIENTE' ? 'Pendiente' : 'Reembolsado'}</Row>
            ) : null}
          </dl>

          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {data.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-4 px-4 py-3 text-base text-ink">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-2">
            <Row label="Subtotal">{formatPrice(data.subtotal)}</Row>
            {data.discount > 0 ? <Row label="Descuento">-{formatPrice(data.discount)}</Row> : null}
            <Row label="Envío">{formatPrice(data.deliveryPrice)}</Row>
            <Row label="Total">
              <strong>{formatPrice(order.total)}</strong>
            </Row>
          </dl>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {order.refundStatus === 'PENDIENTE' ? (
              <Button variant="outline" disabled={busyId === order.id} onClick={() => onRefund(order)}>
                Marcar reembolsado
              </Button>
            ) : null}
            <OrderActions order={order} busy={busyId === order.id} onAction={onAction} />
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
