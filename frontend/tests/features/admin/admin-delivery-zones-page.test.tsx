import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as zoneApi from '@/features/admin/admin-delivery-zone-api';
import { AdminDeliveryZonesPage } from '@/features/admin/admin-delivery-zones-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-delivery-zone-api');
vi.mock('@/features/admin/components/zone-map', () => ({
  ZoneMap: ({
    zones,
    hoveredId,
    selectedId,
    focusRequest,
    drawing,
    onDrawingChange,
    onHover,
    onSelect,
  }: {
    zones: { id: number; name: string }[];
    hoveredId: number | null;
    selectedId: number | null;
    focusRequest: { id: number } | null;
    drawing: { points: unknown[]; editingId: number | null } | null;
    onDrawingChange: (points: { latitude: number; longitude: number }[]) => void;
    onHover: (id: number | null) => void;
    onSelect: (id: number | null) => void;
  }) => (
    <div data-testid="map" data-hovered={String(hoveredId)} data-selected={String(selectedId)} data-focus={String(focusRequest?.id ?? null)} data-drawing={drawing ? `${drawing.points.length}:${drawing.editingId}` : 'no'}>
      <button onClick={() => onDrawingChange([{ latitude: 0, longitude: 0 }])}>dibujar punto</button>
      {zones.map((zone) => (
        <button key={zone.id} onMouseEnter={() => onHover(zone.id)} onMouseLeave={() => onHover(null)} onClick={() => onSelect(zone.id)}>
          polígono {zone.name}
        </button>
      ))}
      <button onClick={() => onSelect(null)}>mapa vacío</button>
    </div>
  ),
}));
vi.mock('@/features/admin/components/zone-form', () => ({
  ZoneForm: ({
    zone,
    points,
    onCancel,
    onSaved,
  }: {
    zone?: { name: string };
    points: unknown[];
    onCancel: () => void;
    onSaved: (message: string, id: number) => void;
  }) => (
    <form aria-label="formulario">
      <p>{zone ? `Editar ${zone.name}` : 'Agregar zona (formulario)'}</p>
      <p>puntos: {points.length}</p>
      <button type="button" onClick={onCancel}>cancelar formulario</button>
      <button type="button" onClick={() => onSaved('Zona agregada', 1)}>guardar formulario</button>
    </form>
  ),
}));

const triangle = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 2 },
  { latitude: 2, longitude: 1 },
];
const zones = [
  { id: 1, name: 'Barranco', price: 6, color: 'celeste' as const, active: true, coordinates: triangle },
  { id: 2, name: 'Miraflores', price: 8, color: 'lima' as const, active: false, coordinates: triangle },
];

function renderPage() {
  render(
    <QueryWrapper>
      <AdminDeliveryZonesPage />
    </QueryWrapper>,
  );
  return userEvent.setup();
}

describe('AdminDeliveryZonesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  it('muestra el estado de carga', () => {
    vi.mocked(zoneApi.listDeliveryZones).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Cargando las zonas...')).toBeInTheDocument();
  });

  it('si falla muestra el mensaje y Reintentar vuelve a cargar', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(zones);
    const user = renderPage();

    expect(await screen.findByText('No pudimos cargar las zonas.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Barranco')).toBeInTheDocument();
  });

  it('sin zonas solo dice que no hay, sin segundo botón de agregar', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Aún no tienes zonas de delivery')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Agregar zona' })).toHaveLength(1);
  });

  it('muestra una tarjeta por zona por nombre, con tarifa y etiqueta de inactiva', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    renderPage();

    await screen.findByText('Barranco');

    expect(screen.getByText('S/ 6.00')).toBeInTheDocument();
    expect(screen.getByText('S/ 8.00')).toBeInTheDocument();
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
  });

  it('el cursor sobre una tarjeta resalta su polígono y sobre un polígono su tarjeta', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');

    await user.hover(screen.getByText('Miraflores'));
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', '2');
    await user.unhover(screen.getByText('Miraflores'));
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', 'null');

    await user.hover(screen.getByRole('button', { name: 'polígono Barranco' }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', '1');
  });

  it('clic en una tarjeta selecciona la zona, la encuadra y deselecciona la anterior', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');

    await user.click(screen.getByRole('button', { name: /^Barranco/, pressed: false }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '1');
    expect(screen.getByTestId('map')).toHaveAttribute('data-focus', '1');

    await user.click(screen.getByRole('button', { name: /^Miraflores/, pressed: false }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '2');
    expect(screen.getByRole('button', { name: /^Barranco/, pressed: false })).toBeInTheDocument();
  });

  it('clic en un polígono selecciona su tarjeta sin encuadrar el mapa', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');

    await user.click(screen.getByRole('button', { name: 'polígono Miraflores' }));

    expect(screen.getByRole('button', { name: /^Miraflores/, pressed: true })).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-focus', 'null');
  });

  it('clic en el mapa vacío quita la selección', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'polígono Barranco' }));

    await user.click(screen.getByRole('button', { name: 'mapa vacío' }));

    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', 'null');
  });

  it('Agregar zona reemplaza las tarjetas por el formulario y pone el mapa en modo dibujo', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');

    await user.click(screen.getByRole('button', { name: 'Agregar zona' }));

    expect(screen.getByRole('form', { name: 'formulario' })).toHaveTextContent('Agregar zona (formulario)');
    expect(screen.queryByText('Barranco')).not.toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-drawing', '0:null');
    expect(screen.getByRole('button', { name: 'Agregar zona' })).toBeDisabled();
  });

  it('los puntos dibujados en el mapa llegan al formulario', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'Agregar zona' }));

    await user.click(screen.getByRole('button', { name: 'dibujar punto' }));

    expect(screen.getByText('puntos: 1')).toBeInTheDocument();
  });

  it('al abrir el formulario se quita el resaltado y la selección', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'polígono Barranco' }));

    await user.click(screen.getByRole('button', { name: 'Agregar zona' }));

    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', 'null');
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', 'null');
  });

  it('Cancelar devuelve las tarjetas', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'Agregar zona' }));

    await user.click(screen.getByRole('button', { name: 'cancelar formulario' }));

    expect(screen.getByText('Barranco')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-drawing', 'no');
  });

  it('al guardar avisa, vuelve a las tarjetas y selecciona la zona', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'Agregar zona' }));

    await user.click(screen.getByRole('button', { name: 'guardar formulario' }));

    expect(await screen.findByText('Zona agregada')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '1');
    expect(screen.getByTestId('map')).toHaveAttribute('data-drawing', 'no');
  });

  it('Editar selecciona la zona, la encuadra y abre el formulario con el polígono en el mapa', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');

    await user.click(screen.getByRole('button', { name: 'Editar Miraflores' }));

    expect(screen.getByRole('form', { name: 'formulario' })).toHaveTextContent('Editar Miraflores');
    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '2');
    expect(screen.getByTestId('map')).toHaveAttribute('data-focus', '2');
    expect(screen.getByTestId('map')).toHaveAttribute('data-drawing', '3:2');
  });

  it('la notificación desaparece sola a los 2 segundos', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValue(zones);
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'Agregar zona' }));
    await user.click(screen.getByRole('button', { name: 'guardar formulario' }));
    expect(await screen.findByText('Zona agregada')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Zona agregada')).not.toBeInTheDocument(), { timeout: 2500 });
  });

  it('eliminar la zona seleccionada la quita de la lista y de la selección', async () => {
    vi.mocked(zoneApi.listDeliveryZones).mockResolvedValueOnce(zones).mockResolvedValue([zones[0]]);
    vi.mocked(zoneApi.deleteDeliveryZone).mockResolvedValue();
    const user = renderPage();
    await screen.findByText('Barranco');
    await user.click(screen.getByRole('button', { name: 'polígono Miraflores' }));

    await user.click(screen.getByRole('button', { name: 'Eliminar Miraflores' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Zona eliminada')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-selected', 'null');
    expect(screen.queryByText('Miraflores')).not.toBeInTheDocument();
  });
});
