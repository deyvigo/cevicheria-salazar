import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import { SearchIcon } from '@/components/icons/search-icon';
import { Input } from '@/components/input';
import { RANGES, STAGES, hasActiveFilters, type OrdersView, type RangePreset } from '@/features/admin/admin-orders-view';
import { DELIVERY_LABELS, PAYMENT_LABELS, PAYMENT_STATUS_LABELS, TYPE_LABELS } from '@/features/admin/order-labels';

const SEARCH_DELAY_MS = 300;
const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  ACTIVE: 'Activos',
  ALL: 'Todos',
  ...DELIVERY_LABELS,
};
const RANGE_LABELS: Record<RangePreset, string> = {
  all: 'Todas',
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Últimos 7 días',
  custom: 'Personalizado',
};

// Same look as the catalog's sort select: the native arrow is hidden and the design system chevron is drawn instead
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-ink">
      {label}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 appearance-none rounded-md border border-border-strong bg-surface pr-11 pl-4 text-base font-normal text-ink focus:border-focus-ring focus:outline-none"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-ink-muted" />
      </div>
    </label>
  );
}

interface OrderFiltersProps {
  view: OrdersView;
  zones: string[];
  onChange: (changes: Partial<OrdersView>) => void;
  onClear: () => void;
}

export function OrderFilters({ view, zones, onChange, onClear }: OrderFiltersProps) {
  const [search, setSearch] = useState(view.q);
  const [draftFrom, setDraftFrom] = useState(view.from);
  const [draftTo, setDraftTo] = useState(view.to);
  const applied = useRef(view.q);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL is the source of truth: "Limpiar filtros" or the back button change it from outside
  useEffect(() => {
    if (view.q !== applied.current) {
      applied.current = view.q;
      setSearch(view.q);
    }
  }, [view.q]);
  useEffect(() => {
    setDraftFrom(view.from);
    setDraftTo(view.to);
  }, [view.from, view.to]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function typeSearch(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const term = value.trim();
      if (term === applied.current) return;
      applied.current = term;
      onChange({ q: term });
    }, SEARCH_DELAY_MS);
  }

  const rangeError = draftFrom !== '' && draftTo !== '' && draftFrom > draftTo;

  function changeDate(key: 'from' | 'to', value: string) {
    const from = key === 'from' ? value : draftFrom;
    const to = key === 'to' ? value : draftTo;
    setDraftFrom(from);
    setDraftTo(to);
    // An invalid range is shown but not applied: the table keeps the previous filter
    if (from !== '' && to !== '' && from > to) return;
    onChange({ [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex w-full max-w-md items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => typeSearch(event.target.value)}
          maxLength={100}
          placeholder="Buscar por código o cliente"
          aria-label="Buscar pedidos"
          className="h-12 w-full rounded-md border border-border-strong pr-12 pl-4 text-base text-ink placeholder:text-ink-subtle focus:border-focus-ring focus:outline-none"
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-3 text-ink-muted">
          <SearchIcon />
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <FilterSelect label="Estado de entrega" value={view.stage} onChange={(value) => onChange({ stage: value as OrdersView['stage'] })}>
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Tipo" value={view.type} onChange={(value) => onChange({ type: value as OrdersView['type'] })}>
          <option value="">Todos</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Pago" value={view.payment} onChange={(value) => onChange({ payment: value as OrdersView['payment'] })}>
          <option value="">Todos</option>
          {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Estado de pago"
          value={view.paymentStatus}
          onChange={(value) => onChange({ paymentStatus: value as OrdersView['paymentStatus'] })}
        >
          <option value="">Todos</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Zona" value={view.zone} onChange={(value) => onChange({ zone: value })}>
          <option value="">Todas</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Fecha"
          value={view.range}
          onChange={(value) => onChange({ range: value as RangePreset, from: '', to: '' })}
        >
          {RANGES.map((range) => (
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
              max={draftTo || undefined}
              onChange={(event) => changeDate('from', event.target.value)}
              error={rangeError ? 'Debe ser anterior a la fecha final' : undefined}
            />
            <Input
              label="Hasta"
              type="date"
              name="to"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(event) => changeDate('to', event.target.value)}
            />
          </>
        ) : null}
        {hasActiveFilters(view) ? (
          <Button variant="outline" onClick={onClear}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
