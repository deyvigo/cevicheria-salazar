import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { formatPrice } from '@/features/catalogo/format';
import { CancelOrderDialog } from '@/features/perfil/components/cancel-order-dialog';
import { DeliveryProgress } from '@/features/perfil/components/delivery-progress';
import { NegativeStatusNotice } from '@/features/perfil/components/negative-status-notice';
import { customerMessage, isNegativeStatus } from '@/features/perfil/delivery-status';
import type { OrderSummary } from '@/features/perfil/order-api';

const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' });

export function orderTitle(names: string[]): string {
  if (names.length === 0) return 'Pedido';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names[0]}, ${names[1]} y ${names.length - 2} más`;
}

export function OrderCard({ order, page = 1 }: { order: OrderSummary; page?: number }) {
  const [cancelling, setCancelling] = useState(false);
  const negative = isNegativeStatus(order.deliveryStatus);

  return (
    <Card className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <div className="min-w-0">
        <h2 className="font-display text-ink line-clamp-2 text-lg leading-6 font-semibold break-words">
          <Link
            to={`/perfil/mis-pedidos/${order.id}`}
            state={{ page }}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:shadow-focus"
          >
            {orderTitle(order.itemNames)}
            <span className="sr-only"> (ver detalle del pedido {order.code})</span>
          </Link>
        </h2>
        <p className="text-sm text-ink-muted">{order.code}</p>
      </div>
      <div className="w-full max-w-44 justify-self-start sm:justify-self-center">
        {negative ? (
          <NegativeStatusNotice
            status={order.deliveryStatus}
            type={order.deliveryType}
            reason={order.deliveryReason}
            refundStatus={order.refundStatus}
          />
        ) : (
          <>
            <DeliveryProgress status={order.deliveryStatus} type={order.deliveryType} />
            <p className="mt-1.5 text-center text-sm text-ink-muted">
              {customerMessage(order.deliveryStatus, order.deliveryType)}
            </p>
          </>
        )}
      </div>
      <div className="sm:text-right">
        <p className="text-ink text-base font-bold">{formatPrice(order.total)}</p>
        <p className="text-sm text-ink-muted">{dateFormat.format(new Date(order.purchasedAt))}</p>
        {order.deliveryStatus === 'PENDIENTE' ? (
          <Button variant="outline" className="relative z-10 mt-2" onClick={() => setCancelling(true)}>
            Cancelar pedido
          </Button>
        ) : null}
      </div>
      <CancelOrderDialog order={cancelling ? order : null} onClose={() => setCancelling(false)} />
    </Card>
  );
}
