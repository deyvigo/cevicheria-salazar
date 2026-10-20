export const ZONE_COLORS = [
  { id: 'celeste', label: 'Celeste', variable: '--celeste-700' },
  { id: 'naranja', label: 'Naranja', variable: '--naranja-500' },
  { id: 'lima', label: 'Lima', variable: '--lima-800' },
  { id: 'aji', label: 'Ají', variable: '--aji-500' },
  { id: 'coral', label: 'Coral', variable: '--coral-800' },
  { id: 'grafito', label: 'Grafito', variable: '--ink-muted' },
] as const;

export type ZoneColorId = (typeof ZONE_COLORS)[number]['id'];

export const DEFAULT_ZONE_COLOR: ZoneColorId = ZONE_COLORS[0].id;

export function zoneColorVariable(id: string): string {
  return (ZONE_COLORS.find((color) => color.id === id) ?? ZONE_COLORS[0]).variable;
}

// Leaflet paints SVG attributes, which cannot use Tailwind classes, so the design-system variable is resolved to its value
export function zoneColorValue(id: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(zoneColorVariable(id)).trim();
  return value || 'currentColor';
}
