import { describe, expect, it } from 'vitest';
import { ZONE_COLORS, zoneColorValue, zoneColorVariable } from '@/features/admin/zone-colors';

describe('zone-colors', () => {
  it('cada color de la paleta tiene un id y una variable CSS propios', () => {
    expect(new Set(ZONE_COLORS.map((color) => color.id)).size).toBe(ZONE_COLORS.length);
    expect(new Set(ZONE_COLORS.map((color) => color.variable)).size).toBe(ZONE_COLORS.length);
    for (const color of ZONE_COLORS) {
      expect(zoneColorVariable(color.id)).toMatch(/^--[a-z]+(-[a-z0-9]+)*$/);
    }
  });

  it('resuelve el valor de la variable en el documento', () => {
    document.documentElement.style.setProperty('--celeste-700', ' #1f6f93 ');

    expect(zoneColorValue('celeste')).toBe('#1f6f93');
  });

  it('un id desconocido usa el primer color', () => {
    expect(zoneColorVariable('rojo')).toBe(ZONE_COLORS[0].variable);
  });
});
