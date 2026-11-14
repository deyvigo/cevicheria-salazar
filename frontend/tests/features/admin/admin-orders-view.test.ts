import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  dateRange,
  hasActiveFilters,
  isDefaultOrder,
  parseView,
  toQuery,
  viewToParams,
} from '@/features/admin/admin-orders-view';

describe('parseView', () => {
  it('sin parámetros devuelve la vista por defecto: fecha descendente y solo pedidos activos', () => {
    expect(parseView(new URLSearchParams())).toEqual(DEFAULT_VIEW);
  });

  it('ignora valores inválidos en vez de fallar', () => {
    const view = parseView(
      new URLSearchParams('page=abc&sort=raro&dir=up&stage=NADA&type=X&payment=Y&range=siempre&from=ayer'),
    );

    expect(view).toEqual(DEFAULT_VIEW);
    expect(parseView(new URLSearchParams('page=0')).page).toBe(1);
    expect(parseView(new URLSearchParams('page=3')).page).toBe(3);
  });

  it('solo toma desde y hasta con el rango personalizado y con formato de fecha válido', () => {
    expect(parseView(new URLSearchParams('range=custom&from=2026-11-01&to=2026-11-05'))).toMatchObject({
      range: 'custom',
      from: '2026-11-01',
      to: '2026-11-05',
    });
    expect(parseView(new URLSearchParams('range=today&from=2026-11-01')).from).toBe('');
    expect(parseView(new URLSearchParams('range=custom&from=01/11/2026')).from).toBe('');
  });
});

describe('viewToParams', () => {
  it('no escribe los valores por defecto', () => {
    expect(viewToParams(DEFAULT_VIEW).toString()).toBe('');
  });

  it('ida y vuelta conserva la vista', () => {
    const view = {
      ...DEFAULT_VIEW,
      page: 2,
      sort: 'total' as const,
      dir: 'asc' as const,
      q: 'maria',
      stage: 'ENTREGADO' as const,
      type: 'RECOJO' as const,
      payment: 'YAPE' as const,
      paymentStatus: 'PENDIENTE_COBRO' as const,
      zone: 'Barranco',
      range: 'custom' as const,
      from: '2026-11-01',
      to: '2026-11-05',
    };

    expect(parseView(viewToParams(view))).toEqual(view);
  });
});

describe('isDefaultOrder y hasActiveFilters', () => {
  it('el orden por defecto exige primera página, fecha y descendente', () => {
    expect(isDefaultOrder(DEFAULT_VIEW)).toBe(true);
    expect(isDefaultOrder({ ...DEFAULT_VIEW, page: 2 })).toBe(false);
    expect(isDefaultOrder({ ...DEFAULT_VIEW, sort: 'code' })).toBe(false);
    expect(isDefaultOrder({ ...DEFAULT_VIEW, dir: 'asc' })).toBe(false);
  });

  it('el filtro de estado activo no cuenta como filtro aplicado, pero cualquier otro sí', () => {
    expect(hasActiveFilters(DEFAULT_VIEW)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_VIEW, stage: 'ALL' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_VIEW, q: 'a' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_VIEW, range: 'today' })).toBe(true);
  });
});

describe('dateRange', () => {
  // 03:00 UTC on Nov 14 is 22:00 on Nov 13 in Lima
  const now = new Date('2026-11-14T03:00:00Z');

  it('cuenta los días en hora de Lima', () => {
    expect(dateRange({ range: 'today', from: '', to: '' }, now)).toEqual({ from: '2026-11-13', to: '2026-11-13' });
    expect(dateRange({ range: 'yesterday', from: '', to: '' }, now)).toEqual({ from: '2026-11-12', to: '2026-11-12' });
    expect(dateRange({ range: 'week', from: '', to: '' }, now)).toEqual({ from: '2026-11-07', to: '2026-11-13' });
  });

  it('todas no limita y personalizado usa lo escrito, con cualquiera de los extremos abierto', () => {
    expect(dateRange({ range: 'all', from: '', to: '' }, now)).toEqual({});
    expect(dateRange({ range: 'custom', from: '2026-11-01', to: '' }, now)).toEqual({ from: '2026-11-01', to: undefined });
  });
});

describe('toQuery', () => {
  it('envía solo lo que tiene valor y traduce el estado a deliveryStatus', () => {
    const query = toQuery({ ...DEFAULT_VIEW, q: 'maria', type: 'ENTREGA', range: 'today' }, new Date('2026-11-14T15:00:00Z'));

    expect(query).toMatchObject({
      page: 1,
      sort: 'date',
      dir: 'desc',
      q: 'maria',
      deliveryStatus: 'ACTIVE',
      type: 'ENTREGA',
      from: '2026-11-14',
      to: '2026-11-14',
    });
    expect(query.payment).toBeUndefined();
    expect(query.zone).toBeUndefined();
  });
});
