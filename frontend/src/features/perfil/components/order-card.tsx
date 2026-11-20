import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { formatPrice } from '@/features/catalogo/format';
import { CancelOrderDialog } from '@/features/perfil/components/cancel-order-dialog';
import { DeliveryProgress } from '@/features/perfil/components/delivery-progress';
import { customerMessage, isNegativeStatus } from '@/features/perfil/delivery-status';
import type { OrderSummary } from '@/features/perfil/order-api';

const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' });

export function orderTitle(names: string[]): string {
  if (names.length === 0) return 'Pedido';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names[0]}, ${names[1]} y ${names.length - 2} más`;
}

export function OrderCard({ order }: { order: OrderSummary }) {
  const [cancelling, setCancelling] = useState(false);
  const negative = isNegativeStatus(order.deliveryStatus);

  return (
    <Card className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <div className="min-w-0">
        <h2 className="font-display text-ink line-clamp-2 text-lg leading-6 font-semibold break-words">
          {orderTitle(order.itemNames)}
        </h2>
        <p className="text-sm text-ink-muted">{order.code}</p>
      </div>
      <div className="w-full max-w-44 justify-self-start sm:justify-self-center">
        {negative ? (
          <div className="flex flex-col gap-1 text-center sm:max-w-44">
            <p className="text-sm font-bold text-error-text">{customerMessage(order.deliveryStatus, order.deliveryType)}</p>
            {order.deliveryReason ? <p className="text-sm text-ink-muted">{order.deliveryReason}</p> : null}
            {order.refundStatus === 'PENDIENTE' ? (
              <p className="text-sm text-ink-muted">Te devolveremos el pago</p>
            ) : null}
            {order.refundStatus === 'REEMBOLSADO' ? <p className="text-sm text-ink-muted">Pago reembolsado</p> : null}
          </div>
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
          <Button variant="outline" className="mt-2" onClick={() => setCancelling(true)}>
            Cancelar pedido
          </Button>
        ) : null}
      </div>
      <CancelOrderDialog order={cancelling ? order : null} onClose={() => setCancelling(false)} />
    </Card>
  );
}
