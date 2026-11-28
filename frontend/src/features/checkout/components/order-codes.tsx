import type { Order } from '@/features/checkout/checkout-api';

export function OrderCodes({ order }: { order: Order }) {
  const instruction =
    order.deliveryType === 'ENTREGA'
      ? 'Díselo al repartidor al recibir tu pedido.'
      : 'Díselo al personal de la tienda al recoger tu pedido.';

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-surface p-4">
        <dt className="text-body text-ink-muted">Código de pedido</dt>
        <dd className="font-display text-title-md text-ink">{order.code}</dd>
      </div>
      <div className="rounded-lg border border-action bg-surface p-4">
        <dt className="text-body text-ink-muted">Código de entrega</dt>
        <dd
          aria-label={`Código de entrega ${order.deliveryCode?.split('').join(' ') ?? ''}`}
          className="font-display text-title-xl tracking-[0.3em] text-ink"
        >
          {order.deliveryCode}
        </dd>
        <p className="text-body text-ink-muted">{instruction}</p>
      </div>
    </dl>
  );
}
