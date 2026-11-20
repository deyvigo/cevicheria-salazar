import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import {
  DEFAULT_REPORT_VIEW,
  parseReportView,
  reportViewToParams,
  toReportQuery,
  type ReportView,
} from '@/features/admin/admin-reports-view';
import { PaymentDonut } from '@/features/admin/components/payment-donut';
import { ReportFilters } from '@/features/admin/components/report-filters';
import { ReportSummaryCards } from '@/features/admin/components/report-summary-cards';
import { SalesBarChart } from '@/features/admin/components/sales-bar-chart';
import { TopDishesTable } from '@/features/admin/components/top-dishes-table';
import { useAdminSalesReport } from '@/features/admin/use-admin-sales-report';

const NO_SALES = 'No hay ventas en este periodo';

function Section({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <Card className={`flex flex-col gap-4 p-6 ${className ?? ''}`}>
      <h2 className="font-display text-[22px] leading-7 font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

export function AdminReportsPage() {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseReportView(params), [params]);
  const query = useMemo(() => toReportQuery(view), [view]);
  const { data, isPending, isError, isFetching, refetch } = useAdminSalesReport(query);

  function change(changes: Partial<ReportView>) {
    setParams(reportViewToParams({ ...view, ...changes }));
  }

  const hasSales = data !== undefined && data.summary.orders > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Reportes</h1>
        <Button variant="outline" onClick={() => refetch()} disabled={query === null || isFetching}>
          Actualizar
        </Button>
      </div>

      <ReportFilters view={view} onChange={change} onClear={() => setParams(reportViewToParams(DEFAULT_REPORT_VIEW))} />

      {query === null ? (
        <p role="status" className="text-base text-ink-muted">
          Elige las fechas del periodo.
        </p>
      ) : null}

      {query !== null && isPending ? <p className="text-base text-ink-muted">Cargando el reporte...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar el reporte.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <ReportSummaryCards summary={data.summary} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
            <Section title="Ventas por día">
              {hasSales ? (
                <SalesBarChart
                periods={data.series}
                granularity={data.granularity}
                from={query?.from ?? data.series[0].date}
                to={query?.to ?? data.series[data.series.length - 1].date}
              />
              ) : (
                <p role="status" className="text-base text-ink-muted">{NO_SALES}</p>
              )}
            </Section>
            {/* The sales chart sets the height of the row; the ranking fills it and scrolls when it has more rows */}
            <Section title="Platos más vendidos" className="lg:relative">
              {data.topDishes.length > 0 ? (
                <div className="max-h-96 overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] lg:absolute lg:inset-x-6 lg:top-[68px] lg:bottom-6 lg:max-h-none">
                  <TopDishesTable dishes={data.topDishes} />
                </div>
              ) : (
                <p role="status" className="text-base text-ink-muted">{NO_SALES}</p>
              )}
            </Section>
          </div>
          <Section title="Ventas por método de pago">
            {hasSales ? (
              <PaymentDonut shares={data.byPayment} />
            ) : (
              <p role="status" className="text-base text-ink-muted">{NO_SALES}</p>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
