import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationPicker } from '@/features/perfil/components/location-picker';

const setView = vi.fn();
let mapClick: ((event: { latlng: { lat: number; lng: number } }) => void) | undefined;

vi.mock('leaflet', () => ({ default: { divIcon: () => ({}) } }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: ({ eventHandlers }: { eventHandlers: { tileload: () => void; tileerror: () => void } }) => (
    <>
      <button onClick={eventHandlers.tileload}>tile ok</button>
      <button onClick={eventHandlers.tileerror}>tile error</button>
    </>
  ),
  Marker: ({
    position,
    eventHandlers,
  }: {
    position: [number, number];
    eventHandlers: { dragend: (event: unknown) => void };
  }) => (
    <button
      data-position={position.join(',')}
      onClick={() => eventHandlers.dragend({ target: { getLatLng: () => ({ lat: -12.123456789, lng: -77.987654321 }) } })}
    >
      marcador
    </button>
  ),
  useMap: () => ({ setView }),
  useMapEvents: (handlers: { click: typeof mapClick }) => {
    mapClick = handlers.click;
    return null;
  },
}));

const value = { latitude: -12.0464, longitude: -77.0428 };

describe('LocationPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('pone el marcador y centra el mapa en el punto recibido', () => {
    render(<LocationPicker value={value} onChange={vi.fn()} onTilesFailed={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'marcador' })).toHaveAttribute('data-position', '-12.0464,-77.0428');
    expect(setView).toHaveBeenCalledWith([-12.0464, -77.0428]);
  });

  it('al soltar el marcador avisa la posición con 6 decimales', async () => {
    const onChange = vi.fn();
    render(<LocationPicker value={value} onChange={onChange} onTilesFailed={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'marcador' }));

    expect(onChange).toHaveBeenCalledWith({ latitude: -12.123457, longitude: -77.987654 });
  });

  it('al tocar el mapa avisa el punto tocado', () => {
    const onChange = vi.fn();
    render(<LocationPicker value={value} onChange={onChange} onTilesFailed={vi.fn()} />);

    act(() => mapClick?.({ latlng: { lat: -12.05, lng: -77.04 } }));

    expect(onChange).toHaveBeenCalledWith({ latitude: -12.05, longitude: -77.04 });
  });

  it('avisa que las teselas fallaron si el primer evento es un error', async () => {
    const onTilesFailed = vi.fn();
    render(<LocationPicker value={value} onChange={vi.fn()} onTilesFailed={onTilesFailed} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'tile error' }));

    expect(onTilesFailed).toHaveBeenCalledTimes(1);
  });

  it('ignora un error de tesela suelto si ya cargó alguna', async () => {
    const onTilesFailed = vi.fn();
    const user = userEvent.setup();
    render(<LocationPicker value={value} onChange={vi.fn()} onTilesFailed={onTilesFailed} />);

    await user.click(screen.getByRole('button', { name: 'tile ok' }));
    await user.click(screen.getByRole('button', { name: 'tile error' }));

    expect(onTilesFailed).not.toHaveBeenCalled();
  });
});
