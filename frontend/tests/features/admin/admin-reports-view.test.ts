import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REPORT_VIEW,
  hasActiveReportFilters,
  parseReportView,
  rangeError,
  reportDates,
  reportViewToParams,
  toReportQuery,
} from '@/features/admin/admin-reports-view';

const NOW = new Date('2026-11-20T15:00:00Z');

describe('parseReportView', () => {
  it('sin parámetros devuelve los últimos 7 días sin filtros', () => {
    expect(parseReportView(new URLSearchParams())).toEqual(DEFAULT_REPORT_VIEW);
  });

  it('ignora valores inválidos y solo toma fechas con el rango personalizado', () => {
    expect(parseReportView(new URLSearchParams('range=siempre&payment=X&type=Y&from=2026-11-01'))).toEqual(
      DEFAULT_REPORT_VIEW,
    );
    expect(parseReportView(new URLSearchParams('range=custom&from=2026-11-01&to=ayer'))).toMatchObject({
      range: 'custom',
      from: '2026-11-01',
      to: '',
    });
  });
});

describe('reportViewToParams', () => {
  it('no escribe los valores por defecto', () => {
    expect(reportViewToParams(DEFAULT_REPORT_VIEW).toString()).toBe('');
    expect(reportViewToParams({ ...DEFAULT_REPORT_VIEW, range: 'month', payment: 'YAPE' }).toString()).toBe(
      'range=month&payment=YAPE',
    );
  });

  it('ida y vuelta conserva la vista', () => {
    const view = { range: 'custom', from: '2026-11-01', to: '2026-11-05', payment: 'ONLINE', type: 'ENTREGA' } as const;

    expect(parseReportView(reportViewToParams(view))).toEqual(view);
  });
});

describe('reportDates', () => {
  it('resuelve los atajos en hora de Lima', () => {
    expect(reportDates({ range: 'today', from: '', to: '' }, NOW)).toEqual({ from: '2026-11-20', to: '2026-11-20' });
    expect(reportDates({ range: 'week', from: '', to: '' }, NOW)).toEqual({ from: '2026-11-14', to: '2026-11-20' });
    expect(reportDates({ range: 'days30', from: '', to: '' }, NOW)).toEqual({ from: '2026-10-22', to: '2026-11-20' });
    expect(reportDates({ range: 'month', from: '', to: '' }, NOW)).toEqual({ from: '2026-11-01', to: '2026-11-20' });
  });

  it('cerca de medianoche usa el día de Lima', () => {
    expect(reportDates({ range: 'today', from: '', to: '' }, new Date('2026-11-21T03:00:00Z')).to).toBe('2026-11-20');
  });
});

describe('rangeError', () => {
  it('valida el orden y el máximo de 366 días', () => {
    expect(rangeError('2026-11-05', '2026-11-01')).toMatch(/posterior/);
    expect(rangeError('2026-01-01', '2027-01-02')).toMatch(/366/);
    expect(rangeError('2026-01-01', '2026-12-31')).toBeNull();
    expect(rangeError('2026-11-01', '')).toBeNull();
  });
});

describe('toReportQuery', () => {
  it('pide el reporte con el periodo y los filtros', () => {
    expect(toReportQuery({ ...DEFAULT_REPORT_VIEW, payment: 'YAPE', type: 'RECOJO' }, NOW)).toEqual({
      from: '2026-11-14',
      to: '2026-11-20',
      payment: 'YAPE',
      type: 'RECOJO',
    });
  });

  it('no pide nada mientras el rango personalizado está incompleto o es inválido', () => {
    expect(toReportQuery({ ...DEFAULT_REPORT_VIEW, range: 'custom' }, NOW)).toBeNull();
    expect(toReportQuery({ ...DEFAULT_REPORT_VIEW, range: 'custom', from: '2026-11-05', to: '2026-11-01' }, NOW)).toBeNull();
  });
});

describe('hasActiveReportFilters', () => {
  it('distingue la vista por defecto', () => {
    expect(hasActiveReportFilters(DEFAULT_REPORT_VIEW)).toBe(false);
    expect(hasActiveReportFilters({ ...DEFAULT_REPORT_VIEW, type: 'ENTREGA' })).toBe(true);
    expect(hasActiveReportFilters({ ...DEFAULT_REPORT_VIEW, range: 'today' })).toBe(true);
  });
});
