export interface ZonePoint {
  latitude: number;
  longitude: number;
}

export function toLatLngs(points: ZonePoint[]): [number, number][] {
  return points.map((point) => [point.latitude, point.longitude]);
}

// Planar shoelace area in degrees: only used to order overlapping zones, never as a real measure
export function polygonArea(points: ZonePoint[]): number {
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += point.longitude * next.latitude - next.longitude * point.latitude;
  });
  return Math.abs(sum) / 2;
}

// Larger zones first, so smaller ones are drawn (and clicked) on top of them
export function sortByAreaDescending<T extends { coordinates: ZonePoint[] }>(zones: T[]): T[] {
  return [...zones].sort((a, b) => polygonArea(b.coordinates) - polygonArea(a.coordinates));
}

function orientation(a: ZonePoint, b: ZonePoint, c: ZonePoint): number {
  const value = (b.longitude - a.longitude) * (c.latitude - a.latitude) - (b.latitude - a.latitude) * (c.longitude - a.longitude);
  return Math.sign(value);
}

function onSegment(a: ZonePoint, b: ZonePoint, p: ZonePoint): boolean {
  return (
    Math.min(a.longitude, b.longitude) <= p.longitude &&
    p.longitude <= Math.max(a.longitude, b.longitude) &&
    Math.min(a.latitude, b.latitude) <= p.latitude &&
    p.latitude <= Math.max(a.latitude, b.latitude)
  );
}

function segmentsIntersect(a: ZonePoint, b: ZonePoint, c: ZonePoint, d: ZonePoint): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && onSegment(a, b, c)) ||
    (o2 === 0 && onSegment(a, b, d)) ||
    (o3 === 0 && onSegment(c, d, a)) ||
    (o4 === 0 && onSegment(c, d, b))
  );
}

export function hasSelfIntersection(points: ZonePoint[]): boolean {
  const count = points.length;
  if (count < 4) return false;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      // Edges that share a vertex touch by definition
      if (j === i + 1 || (i === 0 && j === count - 1)) continue;
      if (segmentsIntersect(points[i], points[(i + 1) % count], points[j], points[(j + 1) % count])) return true;
    }
  }
  return false;
}

export function sameCoordinates(a: ZonePoint[], b: ZonePoint[]): boolean {
  return a.length === b.length && a.every((point, i) => point.latitude === b[i].latitude && point.longitude === b[i].longitude);
}
