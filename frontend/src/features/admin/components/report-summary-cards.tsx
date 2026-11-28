import { Card } from '@/components/card';
import type { SalesSummary } from '@/features/admin/admin-report-api';
import { ordersLabel } from '@/features/admin/report-format';
import { formatPrice } from '@/features/catalogo/format';

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="font-display text-price text-ink">{value}</dd>
      {note ? <dd className="text-body-sm text-ink-muted">{note}</dd> : null}
    </Card>
  );
}

export function ReportSummaryCards({ summary }: { summary: SalesSummary }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Stat label="Ingresos" value={formatPrice(summary.revenue)} />
      <Stat label="Pedidos" value={String(summary.orders)} />
      <Stat label="Ticket promedio" value={formatPrice(summary.averageTicket)} />
      <Stat label="Descuentos" value={formatPrice(summary.discounts)} />
      <Stat label="Por cobrar" value={formatPrice(summary.pendingCollection)} note="Contraentrega aún sin cobrar" />
      <Stat
        label="Reembolsos pendientes"
        value={formatPrice(summary.pendingRefunds.amount)}
        note={`${ordersLabel(summary.pendingRefunds.count)} · no depende del periodo`}
      />
    </dl>
  );
}
