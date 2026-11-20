import { describe, expect, it } from 'vitest';
import { daysBetween, limaDay, limaMonthStart } from '@/lib/lima-dates';

describe('limaDay', () => {
  it('usa el día de Lima, no el de UTC', () => {
    // 02:30 UTC del 8 de noviembre son las 21:30 del 7 en Lima
    const now = new Date('2026-11-08T02:30:00Z');

    expect(limaDay(now)).toBe('2026-11-07');
    expect(limaDay(now, 1)).toBe('2026-11-06');
    expect(limaDay(now, 6)).toBe('2026-11-01');
  });

  it('el inicio del mes sigue el mes de Lima', () => {
    expect(limaMonthStart(new Date('2026-12-01T03:00:00Z'))).toBe('2026-11-01');
    expect(limaMonthStart(new Date('2026-12-01T06:00:00Z'))).toBe('2026-12-01');
  });
});

describe('daysBetween', () => {
  it('cuenta ambos extremos', () => {
    expect(daysBetween('2026-11-01', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-11-01', '2026-11-07')).toBe(7);
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(365);
  });
});
