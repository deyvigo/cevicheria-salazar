import type {
  DeliveryType,
  OrderListParams,
  OrderSortField,
  PaymentFilter,
  PaymentStatus,
  SortDirection,
  StageFilter,
} from '@/features/admin/admin-order-api';

export const SORT_FIELDS: OrderSortField[] = ['code', 'date', 'customer', 'zone', 'total', 'deliveryStatus'];
export const STAGES: StageFilter[] = ['ACTIVE', 'EN_PREPARACION', 'EN_CAMINO', 'ENTREGADO', 'ALL'];
export const RANGES = ['all', 'today', 'yesterday', 'week', 'custom'] as const;
export type RangePreset = (typeof RANGES)[number];

export interface OrdersView {
  page: number;
  sort: OrderSortField;
  dir: SortDirection;
  q: string;
  stage: StageFilter;
  type: DeliveryType | '';
  payment: PaymentFilter | '';
  paymentStatus: PaymentStatus | '';
  zone: string;
  range: RangePreset;
  from: string;
  to: string;
}

export const DEFAULT_VIEW: OrdersView = {
  page: 1,
  sort: 'date',
  dir: 'desc',
  q: '',
  stage: 'ACTIVE',
  type: '',
  payment: '',
  paymentStatus: '',
  zone: '',
  range: 'all',
  from: '',
  to: '',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export function parseView(params: URLSearchParams): OrdersView {
  const page = Number(params.get('page'));
  const range = oneOf(params.get('range'), RANGES, 'all');
  const date = (key: string) => (range === 'custom' && DATE_PATTERN.test(params.get(key) ?? '') ? params.get(key)! : '');
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sort: oneOf(params.get('sort'), SORT_FIELDS, DEFAULT_VIEW.sort),
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    q: params.get('q')?.trim() ?? '',
    stage: oneOf(params.get('stage'), STAGES, DEFAULT_VIEW.stage),
    type: oneOf(params.get('type'), ['', 'ENTREGA', 'RECOJO'] as const, ''),
    payment: oneOf(params.get('payment'), ['', 'ONLINE', 'EFECTIVO', 'YAPE'] as const, ''),
    paymentStatus: oneOf(params.get('paymentStatus'), ['', 'PAGADO', 'PENDIENTE_COBRO'] as const, ''),
    zone: params.get('zone') ?? '',
    range,
    from: date('from'),
    to: date('to'),
  };
}

// Defaults are left out so a pristine view has a clean URL
export function viewToParams(view: OrdersView): URLSearchParams {
  const params = new URLSearchParams();
  (Object.keys(DEFAULT_VIEW) as (keyof OrdersView)[]).forEach((key) => {
    const value = view[key];
    if (value !== DEFAULT_VIEW[key] && value !== '') params.set(key, String(value));
  });
  return params;
}

export function isDefaultOrder(view: OrdersView): boolean {
  return view.page === 1 && view.sort === DEFAULT_VIEW.sort && view.dir === DEFAULT_VIEW.dir;
}

export function hasActiveFilters(view: OrdersView): boolean {
  return (
    view.q !== '' ||
    view.stage !== DEFAULT_VIEW.stage ||
    view.type !== '' ||
    view.payment !== '' ||
    view.paymentStatus !== '' ||
    view.zone !== '' ||
    view.range !== 'all'
  );
}

const LIMA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' });
const DAY_MS = 24 * 60 * 60 * 1000;

// Lima has no daylight saving, so stepping by 24 hours always lands on the previous calendar day
function limaDay(now: Date, daysAgo = 0): string {
  return LIMA_DAY.format(new Date(now.getTime() - daysAgo * DAY_MS));
}

export function dateRange(view: Pick<OrdersView, 'range' | 'from' | 'to'>, now = new Date()): { from?: string; to?: string } {
  switch (view.range) {
    case 'today':
      return { from: limaDay(now), to: limaDay(now) };
    case 'yesterday':
      return { from: limaDay(now, 1), to: limaDay(now, 1) };
    case 'week':
      return { from: limaDay(now, 6), to: limaDay(now) };
    case 'custom':
      return { from: view.from || undefined, to: view.to || undefined };
    default:
      return {};
  }
}

export function toQuery(view: OrdersView, now = new Date()): OrderListParams {
  return {
    page: view.page,
    sort: view.sort,
    dir: view.dir,
    q: view.q || undefined,
    deliveryStatus: view.stage,
    type: view.type || undefined,
    payment: view.payment || undefined,
    paymentStatus: view.paymentStatus || undefined,
    zone: view.zone || undefined,
    ...dateRange(view, now),
  };
}
