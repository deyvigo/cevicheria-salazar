import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { ZoneMap } from '@/features/admin/components/zone-map';

const fitBounds = vi.fn();
let mapClick: ((event?: { latlng: { lat: number; lng: number } }) => void) | undefined;

vi.mock('leaflet', () => ({ default: { divIcon: () => ({}), latLng: (lat: number, lng: number) => ({ lat, lng }) } }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: ({ eventHandlers }: { eventHandlers: { tileerror: () => void } }) => (
    <button onClick={eventHandlers.tileerror}>tile error</button>
  ),
  Polygon: ({
    positions,
    pathOptions,
    eventHandlers,
    interactive,
  }: {
    positions: [number, number][];
    pathOptions: Record<string, unknown>;
    eventHandlers?: { mouseover: () => void; mouseout: () => void; click: () => void };
    interactive?: boolean;
  }) => (
    <div
      data-testid="polygon"
      data-first={positions[0].join(',')}
      data-style={JSON.stringify(pathOptions)}
      data-interactive={String(interactive !== false)}
      onMouseOver={eventHandlers?.mouseover}
      onMouseOut={eventHandlers?.mouseout}
      onClick={eventHandlers?.click}
    />
  ),
  Marker: () => null,
  Polyline: () => null,
  useMap: () => ({ fitBounds }),
  useMapEvents: (handlers: { click: typeof mapClick }) => {
    mapClick = handlers.click;
    return null;
  },
}));

function square(id: number, size: number, active = true): DeliveryZone {
  return {
    id,
    name: `Zona ${id}`,
    price: 5,
    color: 'celeste',
    active,
    coordinates: [
      { latitude: id, longitude: 0 },
      { latitude: id, longitude: size },
      { latitude: id + size, longitude: size },
      { latitude: id + size, longitude: 0 },
    ],
  };
}

const big = square(1, 10);
const small = square(2, 1);
const inactive = square(3, 3, false);

function renderMap(overrides: Partial<Parameters<typeof ZoneMap>[0]> = {}) {
  const handlers = { onHover: vi.fn(), onSelect: vi.fn(), onTilesFailed: vi.fn(), onDrawingChange: vi.fn() };
  render(
    <ZoneMap
      zones={[small, big, inactive]}
      hoveredId={null}
      selectedId={null}
      focusRequest={null}
      drawing={null}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

function styleOf(first: string) {
  const element = screen.getAllByTestId('polygon').find((candidate) => candidate.dataset.first === first);
  return JSON.parse(element!.dataset.style!);
}

describe('ZoneMap', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('dibuja un polígono por zona y las más pequeñas después de las grandes', () => {
    renderMap();

    expect(screen.getAllByTestId('polygon').map((polygon) => polygon.dataset.first)).toEqual(['1,0', '3,0', '2,0']);
  });

  it('encuadra todas las zonas al cargar', () => {
    renderMap();

    expect(fitBounds).toHaveBeenCalledTimes(1);
  });

  it('el cursor sobre un polígono avisa la zona y al salir la quita', async () => {
    const { onHover } = renderMap();
    const user = userEvent.setup();
    const polygon = screen.getAllByTestId('polygon')[2];

    await user.hover(polygon);
    await user.unhover(polygon);

    expect(onHover).toHaveBeenNthCalledWith(1, 2);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('el clic en un polígono selecciona su zona', async () => {
    const { onSelect } = renderMap();

    await userEvent.setup().click(screen.getAllByTestId('polygon')[0]);

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('el clic en el mapa vacío quita la selección', () => {
    const { onSelect } = renderMap();

    act(() => mapClick?.());

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('el estilo cambia con el resaltado y la selección', () => {
    renderMap({ hoveredId: 1, selectedId: 2 });

    expect(styleOf('1,0').weight).toBe(3);
    expect(styleOf('2,0').weight).toBe(4);
    expect(styleOf('2,0').fillOpacity).toBeGreaterThan(styleOf('1,0').fillOpacity);
    expect(styleOf('1,0').bubblingMouseEvents).toBe(false);
  });

  it('una zona inactiva se dibuja punteada y tenue', () => {
    renderMap();

    expect(styleOf('3,0').dashArray).toBe('6 6');
    expect(styleOf('3,0').fillOpacity).toBeLessThan(styleOf('1,0').fillOpacity);
    expect(styleOf('1,0').dashArray).toBeUndefined();
  });

  it('al elegir una zona desde la tarjeta encuadra su polígono', () => {
    renderMap({ focusRequest: { id: 2, nonce: 1 } });

    expect(fitBounds).toHaveBeenCalledTimes(2);
    expect(fitBounds).toHaveBeenLastCalledWith(
      [[2, 0], [2, 1], [3, 1], [3, 0]],
      expect.objectContaining({ maxZoom: 17 }),
    );
  });

  it('sin zonas no encuadra nada y no dibuja polígonos', () => {
    renderMap({ zones: [] });

    expect(screen.queryAllByTestId('polygon')).toHaveLength(0);
    expect(fitBounds).not.toHaveBeenCalled();
  });

  describe('mientras se dibuja', () => {
    it('las demás zonas no son interactivas y el clic en el mapa añade un punto en vez de quitar la selección', () => {
      const { onSelect, onDrawingChange } = renderMap({ drawing: { points: [], color: 'celeste', editingId: null } });

      for (const polygon of screen.getAllByTestId('polygon')) {
        expect(polygon).toHaveAttribute('data-interactive', 'false');
      }
      act(() => mapClick?.({ latlng: { lat: -12.1, lng: -77.1 } }));
      expect(onSelect).not.toHaveBeenCalled();
      expect(onDrawingChange).toHaveBeenCalledWith([{ latitude: -12.1, longitude: -77.1 }]);
    });

    it('pasar el cursor o hacer clic sobre ellas no avisa', async () => {
      const { onHover, onSelect } = renderMap({ drawing: { points: [], color: 'celeste', editingId: null } });
      const user = userEvent.setup();

      await user.hover(screen.getAllByTestId('polygon')[0]);
      await user.click(screen.getAllByTestId('polygon')[0]);

      expect(onHover).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('la zona que se edita deja de dibujarse como zona guardada', () => {
      renderMap({ drawing: { points: [], color: 'celeste', editingId: 2 } });

      expect(screen.getAllByTestId('polygon').map((polygon) => polygon.dataset.first)).toEqual(['1,0', '3,0']);
    });
  });

  it('si las teselas fallan avisa', async () => {
    const { onTilesFailed } = renderMap();

    await userEvent.setup().click(screen.getByRole('button', { name: 'tile error' }));

    expect(onTilesFailed).toHaveBeenCalled();
  });
});
