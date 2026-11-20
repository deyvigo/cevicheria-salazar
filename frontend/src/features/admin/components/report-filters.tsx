import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { PAYMENT_LABELS, TYPE_LABELS } from '@/features/admin/order-labels';
import { FilterSelect } from '@/features/admin/components/filter-select';
import {
  REPORT_RANGES,
  hasActiveReportFilters,
  rangeError,
  type ReportRange,
  type ReportView,
} from '@/features/admin/admin-reports-view';

const RANGE_LABELS: Record<ReportRange, string> = {
  today: 'Hoy',
  week: 'Últimos 7 días',
  days30: 'Últimos 30 días',
  month: 'Este mes',
  custom: 'Personalizado',
};

interface ReportFiltersProps {
  view: ReportView;
  onChange: (changes: Partial<ReportView>) => void;
  onClear: () => void;
}

export function ReportFilters({ view, onChange, onClear }: ReportFiltersProps) {
  const [draftFrom, setDraftFrom] = useState(view.from);
  const [draftTo, setDraftTo] = useState(view.to);

  useEffect(() => {
    setDraftFrom(view.from);
    setDraftTo(view.to);
  }, [view.from, view.to]);

  const error = rangeError(draftFrom, draftTo);

  function changeDate(key: 'from' | 'to', value: string) {
    const from = key === 'from' ? value : draftFrom;
    const to = key === 'to' ? value : draftTo;
    setDraftFrom(from);
    setDraftTo(to);
    // An invalid range is shown but not applied: the report keeps the previous filter
    if (rangeError(from, to) !== null) return;
    onChange({ [key]: value });
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterSelect
        label="Periodo"
        value={view.range}
        onChange={(value) => onChange({ range: value as ReportRange, from: '', to: '' })}
      >
        {REPORT_RANGES.map((range) => (
          <option key={range} value={range}>
            {RANGE_LABELS[range]}
          </option>
        ))}
      </FilterSelect>
      {view.range === 'custom' ? (
        <>
          <Input
            label="Desde"
            type="date"
            name="from"
            value={draftFrom}
            onChange={(event) => changeDate('from', event.target.value)}
            error={error ?? undefined}
          />
          <Input
            label="Hasta"
            type="date"
            name="to"
            value={draftTo}
            onChange={(event) => changeDate('to', event.target.value)}
          />
        </>
      ) : null}
      <FilterSelect label="Pago" value={view.payment} onChange={(value) => onChange({ payment: value as ReportView['payment'] })}>
        <option value="">Todos</option>
        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Tipo" value={view.type} onChange={(value) => onChange({ type: value as ReportView['type'] })}>
        <option value="">Todos</option>
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      {hasActiveReportFilters(view) ? (
        <Button variant="outline" onClick={onClear}>
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
