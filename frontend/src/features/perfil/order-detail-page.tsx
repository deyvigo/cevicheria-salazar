import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { formatDateTime } from '@/features/catalogo/format';
import { OrderSummaryTable } from '@/features/checkout/components/order-summary-table';
import { useOrder } from '@/features/checkout/use-order';
import { CancelOrderDialog } from '@/features/perfil/components/cancel-order-dialog';
import { DeliveryCodeBox } from '@/features/perfil/components/delivery-code-box';
import { DeliveryProgress } from '@/features/perfil/components/delivery-progress';
import { NegativeStatusNotice } from '@/features/perfil/components/negative-status-notice';
import { orderTitle } from '@/features/perfil/components/order-card';
import { OrderDetailInfo } from '@/features/perfil/components/order-detail-info';
import { customerMessage, isNegativeStatus } from '@/features/perfil/delivery-status';

const FINAL_STATUSES = ['ENTREGADO', 'RECHAZADO', 'CANCELADO', 'FALLIDO'];

const linkClass = 'text-button text-ink underline focus-visible:shadow-focus focus-visible:outline-none';

export function OrderDetailPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const [cancelling, setCancelling] = useState(false);
  const id = orderId !== undefined && /^[0-9]+$/.test(orderId) && Number(orderId) > 0 ? Number(orderId) : null;
  const order = useOrder(id, false);

  const fromPage = (location.state as { page?: number } | null)?.page;
  const backTo = fromPage && fromPage > 1 ? `/perfil/mis-pedidos?page=${fromPage}` : '/perfil/mis-pedidos';
  const back = (
    <Link to={backTo} className={linkClass}>
      Volver a mis pedidos
    </Link>
  );

  const data = order.data;
  const notPurchased = data !== undefined && data.status !== 'PAGADO' && data.status !== 'PENDIENTE_COBRO';
  const notFound = id === null || notPurchased || (isAxiosError(order.error) && order.error.response?.status === 404);

  if (notFound) {
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        <h1 className="font-display text-ink text-title-lg">No encontramos este pedido</h1>
        {back}
      </div>
    );
  }
  if (order.isPending) {
    return <div aria-busy="true" className="h-64 animate-pulse rounded-lg bg-surface-celeste" />;
  }
  if (order.isError || !data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body font-bold text-error-text">No pudimos cargar tu pedido.</p>
        <Button variant="outline" onClick={() => void order.refetch()}>
          Reintentar
        </Button>
        {back}
      </div>
    );
  }

  const negative = isNegativeStatus(data.deliveryStatus);
  const showCode = data.deliveryCode !== null && !FINAL_STATUSES.includes(data.deliveryStatus);

  return (
    <div className="flex flex-col gap-6">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-ink text-title-lg break-words">
          {orderTitle(data.items.map((item) => item.name))}
        </h1>
        <p className="text-body text-ink-muted">
          {data.code} · {formatDateTime(data.purchasedAt)}
        </p>
      </header>

      <section aria-label="Estado del pedido" className="rounded-lg border border-border bg-surface p-6">
        {negative ? (
          <NegativeStatusNotice
            size="lg"
            status={data.deliveryStatus}
            type={data.deliveryType}
            reason={data.deliveryReason}
            refundStatus={data.refundStatus}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <DeliveryProgress size="lg" status={data.deliveryStatus} type={data.deliveryType} />
            <p className="text-center text-body text-ink-muted">{customerMessage(data.deliveryStatus, data.deliveryType)}</p>
          </div>
        )}
      </section>

      <OrderDetailInfo order={data} />
      <OrderSummaryTable order={data} />
      {showCode && data.deliveryCode ? <DeliveryCodeBox code={data.deliveryCode} type={data.deliveryType} /> : null}

      {data.deliveryStatus === 'PENDIENTE' ? (
        <div>
          <Button variant="outline" onClick={() => setCancelling(true)}>
            Cancelar pedido
          </Button>
        </div>
      ) : null}
      <CancelOrderDialog order={cancelling ? data : null} onClose={() => setCancelling(false)} />
    </div>
  );
}
