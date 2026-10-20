import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZoneDrawingLayer } from '@/features/admin/components/zone-drawing-layer';

let mapClick: ((event: { latlng: { lat: number; lng: number } }) => void) | undefined;

vi.mock('leaflet', () => ({
  default: {
    divIcon: (options: { iconSize: number[] }) => ({ size: options.iconSize[0] }),
    latLng: (lat: number, lng: number) => ({ lat, lng }),
  },
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('react-leaflet', () => ({
  Polygon: ({ pathOptions, interactive }: { pathOptions: { color: string }; interactive: boolean }) => (
    <div data-testid={interactive === false ? 'polygon' : 'polygon-interactive'} data-color={pathOptions.color} />
  ),
  Polyline: () => <div data-testid="polyline" />,
  Marker: ({
    position,
    icon,
    eventHandlers,
  }: {
    position: [number, number];
    icon: { size: number };
    eventHandlers: { click?: () => void; dragend?: (event: unknown) => void };
  }) =>
    icon.size === 18 ? (
      <div data-testid="vertex">
        <button onClick={eventHandlers.click}>quitar {position.join(',')}</button>
        <button
          onClick={() => eventHandlers.dragend?.({ target: { getLatLng: () => ({ lat: -1.1234567, lng: -2.7654321 }) } })}
        >
          mover {position.join(',')}
        </button>
      </div>
    ) : (
      <button onClick={eventHandlers.click}>medio {position.join(',')}</button>
    ),
  useMapEvents: (handlers: { click: typeof mapClick }) => {
    mapClick = handlers.click;
    return null;
  },
}));

const point = (latitude: number, longitude: number) => ({ latitude, longitude });
const triangle = [point(0, 0), point(0, 2), point(2, 1)];
const square = [point(0, 0), point(0, 2), point(2, 2), point(2, 0)];

function renderEditor(points = triangle, onChange = vi.fn(), color = 'celeste') {
  render(<ZoneDrawingLayer points={points} color={color} onChange={onChange} />);
  return onChange;
}

describe('ZoneDrawingLayer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.documentElement.style.setProperty('--celeste-700', 'rgb(1, 2, 3)');
    document.documentElement.style.setProperty('--coral-800', 'rgb(9, 8, 7)');
  });

  it('cada clic en el mapa agrega un vértice al final', () => {
    const onChange = renderEditor([point(0, 0)]);

    act(() => mapClick?.({ latlng: { lat: -12.1234567, lng: -77.7654321 } }));

    expect(onChange).toHaveBeenCalledWith([point(0, 0), point(-12.123457, -77.765432)]);
  });

  it('dibuja una línea con 2 puntos y el polígono desde 3', () => {
    const { unmount } = render(
      <ZoneDrawingLayer points={[point(0, 0), point(1, 1)]} color="celeste" onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('polyline')).toBeInTheDocument();
    expect(screen.queryByTestId('polygon')).not.toBeInTheDocument();
    unmount();

    renderEditor();
    expect(screen.getByTestId('polygon')).toBeInTheDocument();
  });

  it('arrastrar un vértice emite las coordenadas nuevas', async () => {
    const onChange = renderEditor();

    await userEvent.setup().click(screen.getByRole('button', { name: 'mover 0,2' }));

    expect(onChange).toHaveBeenCalledWith([point(0, 0), point(-1.123457, -2.765432), point(2, 1)]);
  });

  it('tocar un vértice lo quita cuando quedan más de 3', async () => {
    const onChange = renderEditor(square);

    await userEvent.setup().click(screen.getByRole('button', { name: 'quitar 2,2' }));

    expect(onChange).toHaveBeenCalledWith([point(0, 0), point(0, 2), point(2, 0)]);
  });

  it('con solo 3 vértices no se puede quitar ninguno', async () => {
    const onChange = renderEditor();

    await userEvent.setup().click(screen.getByRole('button', { name: 'quitar 0,0' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('tocar el punto medio de un lado agrega un vértice en esa posición', async () => {
    const onChange = renderEditor();

    await userEvent.setup().click(screen.getByRole('button', { name: 'medio 0,1' }));

    expect(onChange).toHaveBeenCalledWith([point(0, 0), point(0, 1), point(0, 2), point(2, 1)]);
  });

  it('el polígono toma el color elegido', () => {
    renderEditor(triangle, vi.fn(), 'coral');

    expect(screen.getByTestId('polygon')).toHaveAttribute('data-color', 'rgb(9, 8, 7)');
  });
});
