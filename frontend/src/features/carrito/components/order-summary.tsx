import { formatPrice } from '@/features/catalogo/format';
import type { OrderSummary as Summary } from '@/features/carrito/order-summary';

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-base text-ink-muted">{label}</dt>
      <dd className="text-base text-ink">{formatPrice(value)}</dd>
    </div>
  );
}

export function OrderSummary({ summary }: { summary: Summary | null }) {
  return (
    <section
      aria-labelledby="order-summary-title"
      aria-busy={summary === null}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      <h2 id="order-summary-title" className="font-display text-[18px] leading-6 font-semibold text-ink">
        Resumen del pedido
      </h2>
      {summary === null ? (
        <div className="h-32 animate-pulse rounded-md bg-surface-celeste" />
      ) : (
        <dl className="flex flex-col gap-3">
          <Row label="Subtotal" value={summary.subtotal} />
          <Row label="Descuento" value={summary.discount} />
          <Row label="Delivery" value={summary.delivery} />
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-display text-[18px] leading-6 font-semibold text-ink">Total</dt>
            <dd className="font-display text-[24px] leading-8 font-semibold text-ink">{formatPrice(summary.total)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
