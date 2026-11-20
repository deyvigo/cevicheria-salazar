import type { Granularity } from '@/features/admin/admin-report-api';

const DAY = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const FULL_DAY = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// The dates are Lima calendar days without a time: formatting them in UTC keeps the day from shifting
function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function periodLabel(date: string, granularity: Granularity): string {
  if (granularity === 'MONTH') return MONTH.format(parse(date)).replace('.', '');
  return DAY.format(parse(date)).replace('.', '');
}

export function periodTitle(date: string, granularity: Granularity): string {
  if (granularity === 'MONTH') return MONTH.format(parse(date)).replace('.', '');
  const day = FULL_DAY.format(parse(date));
  return granularity === 'WEEK' ? `Semana del ${day}` : day;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function ordersLabel(count: number): string {
  return count === 1 ? '1 pedido' : `${count} pedidos`;
}

export function dayTitle(date: string): string {
  return FULL_DAY.format(parse(date));
}
