import type { OrderDeliveryType } from '@/features/perfil/order-api';

export function DeliveryCodeBox({ code, type }: { code: string; type: OrderDeliveryType }) {
  const instruction =
    type === 'ENTREGA'
      ? 'Díselo al repartidor al recibir tu pedido.'
      : 'Díselo al personal de la tienda al recoger tu pedido.';

  return (
    <div className="rounded-lg border border-action bg-surface p-4">
      <p className="text-body text-ink-muted">Código de entrega</p>
      <p
        aria-label={`Código de entrega ${code.split('').join(' ')}`}
        className="font-display text-title-xl tracking-[0.3em] text-ink"
      >
        {code}
      </p>
      <p className="text-body text-ink-muted">{instruction}</p>
    </div>
  );
}
