import { describe, expect, it } from 'vitest';
import { hasSelfIntersection, polygonArea, sameCoordinates, sortByAreaDescending } from '@/features/admin/zone-geometry';

const point = (latitude: number, longitude: number) => ({ latitude, longitude });
const square = (size: number) => [point(0, 0), point(0, size), point(size, size), point(size, 0)];

describe('zone-geometry', () => {
  it('calcula el área de un cuadrado conocido', () => {
    expect(polygonArea(square(2))).toBe(4);
  });

  it('ordena de la zona más grande a la más pequeña', () => {
    const zones = [{ id: 1, coordinates: square(1) }, { id: 2, coordinates: square(3) }, { id: 3, coordinates: square(2) }];

    expect(sortByAreaDescending(zones).map((zone) => zone.id)).toEqual([2, 3, 1]);
  });

  it('detecta un polígono en forma de moño', () => {
    expect(hasSelfIntersection([point(0, 0), point(2, 2), point(2, 0), point(0, 2)])).toBe(true);
  });

  it('acepta un cuadrado, un triángulo y un polígono cóncavo', () => {
    expect(hasSelfIntersection(square(2))).toBe(false);
    expect(hasSelfIntersection([point(0, 0), point(0, 2), point(2, 1)])).toBe(false);
    expect(hasSelfIntersection([point(0, 0), point(0, 4), point(4, 4), point(2, 2), point(4, 0)])).toBe(false);
  });

  it('compara coordenadas punto por punto', () => {
    expect(sameCoordinates(square(1), square(1))).toBe(true);
    expect(sameCoordinates(square(1), square(2))).toBe(false);
    expect(sameCoordinates(square(1), square(1).slice(1))).toBe(false);
  });
});
