import { useState } from 'react';
import type { Granularity, SalesPeriod } from '@/features/admin/admin-report-api';
import { dayTitle, ordersLabel, periodLabel, periodTitle } from '@/features/admin/report-format';
import { formatPrice } from '@/features/catalogo/format';

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 12, right: 8, bottom: 32, left: 56 };
const MAX_LABELS = 8;

// Rounds the top of the axis to 1, 2 or 5 times a power of ten so the grid lines fall on readable amounts
function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= value)!;
  return step * magnitude;
}

interface SalesBarChartProps {
  periods: SalesPeriod[];
  granularity: Granularity;
  from: string;
  to: string;
}

export function SalesBarChart({ periods, granularity, from, to }: SalesBarChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...periods.map((period) => period.revenue)));
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerWidth / periods.length;
  const barWidth = Math.min(slot * 0.7, 48);
  const labelEvery = Math.ceil(periods.length / MAX_LABELS);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const current = active === null ? null : periods[active];
  const totalRevenue = periods.reduce((sum, period) => sum + period.revenue, 0);
  const totalOrders = periods.reduce((sum, period) => sum + period.orders, 0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Ventas por ${granularity === 'DAY' ? 'día' : granularity === 'WEEK' ? 'semana' : 'mes'}: ${periods.length} periodos`}
        className="h-auto w-full"
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((tick) => {
          const y = PAD.top + innerHeight * (1 - tick);
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-ink-muted text-[11px]">
                {Math.round(max * tick)}
              </text>
            </g>
          );
        })}
        {periods.map((period, index) => {
          const height = (period.revenue / max) * innerHeight;
          const x = PAD.left + slot * index + (slot - barWidth) / 2;
          return (
            <g key={period.date}>
              <rect
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={innerHeight}
                className="fill-transparent"
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(index)}
              />
              <rect
                x={x}
                y={PAD.top + innerHeight - height}
                width={barWidth}
                height={Math.max(height, period.revenue > 0 ? 2 : 0)}
                rx={3}
                className={active === index ? 'fill-action-hover' : 'fill-action'}
                pointerEvents="none"
              />
              {index % labelEvery === 0 ? (
                <text
                  x={PAD.left + slot * index + slot / 2}
                  y={HEIGHT - 10}
                  textAnchor="middle"
                  className="fill-ink-muted text-[11px]"
                >
                  {periodLabel(period.date, granularity)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div role="status" className="min-h-6 text-sm text-ink-muted">
        {current ? (
          <>
            <span className="font-bold text-ink">{periodTitle(current.date, granularity)}</span>
            {': '}
            {formatPrice(current.revenue)} · {ordersLabel(current.orders)}
          </>
        ) : (
          <>
            <span className="font-bold text-ink">{`Del ${dayTitle(from)} al ${dayTitle(to)}`}</span>
            {': '}
            {formatPrice(totalRevenue)} · {ordersLabel(totalOrders)}
          </>
        )}
      </div>

      <div className="sr-only">
        <table>
        <caption>Ventas por periodo</caption>
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Pedidos</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.date}>
              <th scope="row">{periodTitle(period.date, granularity)}</th>
              <td>{formatPrice(period.revenue)}</td>
              <td>{period.orders}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
