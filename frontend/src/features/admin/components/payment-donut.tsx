import { useState } from 'react';
import type { PaymentShare } from '@/features/admin/admin-report-api';
import { PAYMENT_LABELS } from '@/features/admin/order-labels';
import { formatPercentage, ordersLabel } from '@/features/admin/report-format';
import { formatPrice } from '@/features/catalogo/format';

const SIZE = 200;
const RADIUS = 76;
const STROKE = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COLORS: Record<PaymentShare['method'], { stroke: string; swatch: string }> = {
  ONLINE: { stroke: 'stroke-celeste-700', swatch: 'bg-celeste-700' },
  EFECTIVO: { stroke: 'stroke-naranja-500', swatch: 'bg-naranja-500' },
  YAPE: { stroke: 'stroke-lima-800', swatch: 'bg-lima-800' },
};

export function PaymentDonut({ shares }: { shares: PaymentShare[] }) {
  const [active, setActive] = useState<PaymentShare['method'] | null>(null);
  const total = shares.reduce((sum, share) => sum + share.revenue, 0);
  const current = shares.find((share) => share.method === active) ?? null;

  let offset = 0;
  const segments = shares
    .filter((share) => share.percentage > 0)
    .map((share) => {
      const length = (share.percentage / 100) * CIRCUMFERENCE;
      const segment = { share, length, offset };
      offset += length;
      return segment;
    });

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
      <div className="flex shrink-0 flex-col items-center gap-3">
        <div className="relative h-[200px] w-[200px]">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Ingresos por método de pago" className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-border" />
            {segments.map(({ share, length, offset: start }) => (
              <circle
                key={share.method}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                className={`${COLORS[share.method].stroke} outline-none transition-opacity ${active !== null && active !== share.method ? 'opacity-40' : ''}`}
                onMouseEnter={() => setActive(share.method)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(share.method)}
              />
            ))}
          </svg>
          <div
            role="status"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          >
            {current ? (
              <>
                <span className="text-sm font-bold text-ink">{PAYMENT_LABELS[current.method]}</span>
                <span className="font-display text-lg font-semibold text-ink">{formatPrice(current.revenue)}</span>
                <span className="text-xs text-ink-muted">
                  {`${ordersLabel(current.orders)} · ${formatPercentage(current.percentage)}`}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm text-ink-muted">Total</span>
                <span className="font-display text-xl font-semibold text-ink">{formatPrice(total)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <table className="w-full text-left text-base">
        <thead>
          <tr className="border-b border-border text-sm text-ink-muted">
            <th scope="col" className="py-2 pr-4 font-bold">Método</th>
            <th scope="col" className="py-2 pr-4 text-right font-bold">Pedidos</th>
            <th scope="col" className="py-2 pr-4 text-right font-bold">Ingresos</th>
            <th scope="col" className="py-2 text-right font-bold">%</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((share) => (
            <tr key={share.method} className="border-b border-border">
              <th scope="row" className="py-2 pr-4 font-normal text-ink">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-sm ${COLORS[share.method].swatch}`} />
                  {PAYMENT_LABELS[share.method]}
                </span>
              </th>
              <td className="py-2 pr-4 text-right text-ink">{share.orders}</td>
              <td className="py-2 pr-4 text-right text-ink">{formatPrice(share.revenue)}</td>
              <td className="py-2 text-right text-ink">{formatPercentage(share.percentage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
