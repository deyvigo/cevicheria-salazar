import { describe, expect, it } from 'vitest';
import { formatDateTime, formatPrice } from '@/features/catalogo/format';

describe('format', () => {
  it('formatPrice usa el formato S/ 32.00', () => {
    expect(formatPrice(32)).toBe('S/ 32.00');
    expect(formatPrice(8.5)).toBe('S/ 8.50');
  });

  it('formatDateTime usa la hora de Lima y no cambia de día cerca de medianoche', () => {
    // 04:30 UTC on Nov 8 is 23:30 on Nov 7 in Lima
    const text = formatDateTime('2026-11-08T04:30:00Z');

    expect(text).toContain('7');
    expect(text).toContain('23:30');
    expect(text).toMatch(/nov/i);
  });
});
