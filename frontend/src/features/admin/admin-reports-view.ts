import type { DeliveryType, PaymentFilter } from '@/features/admin/admin-order-api';
import type { SalesReportParams } from '@/features/admin/admin-report-api';
import { daysBetween, limaDay, limaMonthStart } from '@/lib/lima-dates';

export const MAX_RANGE_DAYS = 366;
export const REPORT_RANGES = ['today', 'week', 'days30', 'month', 'custom'] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export interface ReportView {
  range: ReportRange;
  from: string;
  to: string;
  payment: PaymentFilter | '';
  type: DeliveryType | '';
}

export const DEFAULT_REPORT_VIEW: ReportView = { range: 'week', from: '', to: '', payment: '', type: '' };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export function parseReportView(params: URLSearchParams): ReportView {
  const range = oneOf(params.get('range'), REPORT_RANGES, DEFAULT_REPORT_VIEW.range);
  const date = (key: string) => (range === 'custom' && DATE_PATTERN.test(params.get(key) ?? '') ? params.get(key)! : '');
  return {
    range,
    from: date('from'),
    to: date('to'),
    payment: oneOf(params.get('payment'), ['', 'ONLINE', 'EFECTIVO', 'YAPE'] as const, ''),
    type: oneOf(params.get('type'), ['', 'ENTREGA', 'RECOJO'] as const, ''),
  };
}

// Defaults are left out so a pristine view has a clean URL
export function reportViewToParams(view: ReportView): URLSearchParams {
  const params = new URLSearchParams();
  (Object.keys(DEFAULT_REPORT_VIEW) as (keyof ReportView)[]).forEach((key) => {
    const value = view[key];
    if (value !== DEFAULT_REPORT_VIEW[key] && value !== '') params.set(key, value);
  });
  return params;
}

export function hasActiveReportFilters(view: ReportView): boolean {
  return view.range !== DEFAULT_REPORT_VIEW.range || view.payment !== '' || view.type !== '';
}

export function reportDates(view: Pick<ReportView, 'range' | 'from' | 'to'>, now = new Date()): { from: string; to: string } {
  switch (view.range) {
    case 'today':
      return { from: limaDay(now), to: limaDay(now) };
    case 'days30':
      return { from: limaDay(now, 29), to: limaDay(now) };
    case 'month':
      return { from: limaMonthStart(now), to: limaDay(now) };
    case 'custom':
      return { from: view.from, to: view.to };
    default:
      return { from: limaDay(now, 6), to: limaDay(now) };
  }
}

export function rangeError(from: string, to: string): string | null {
  if (from === '' || to === '') return null;
  if (from > to) return 'La fecha inicial no puede ser posterior a la final';
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return 'El rango no puede superar los 366 días';
  return null;
}

/** Null while a custom range is incomplete or invalid: nothing is requested until it is fixed. */
export function toReportQuery(view: ReportView, now = new Date()): SalesReportParams | null {
  const { from, to } = reportDates(view, now);
  if (from === '' || to === '' || rangeError(from, to) !== null) return null;
  return { from, to, payment: view.payment || undefined, type: view.type || undefined };
}
