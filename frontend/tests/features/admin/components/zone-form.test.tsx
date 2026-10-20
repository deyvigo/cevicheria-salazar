import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as zoneApi from '@/features/admin/admin-delivery-zone-api';
import { ZoneForm } from '@/features/admin/components/zone-form';
import type { ZoneColorId } from '@/features/admin/zone-colors';
import type { ZonePoint } from '@/features/admin/zone-geometry';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-delivery-zone-api');

const triangle = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 2 },
  { latitude: 2, longitude: 1 },
];
const bowtie = [
  { latitude: 0, longitude: 0 },
  { latitude: 2, longitude: 2 },
  { latitude: 2, longitude: 0 },
  { latitude: 0, longitude: 2 },
];
const existing = { id: 7, name: 'Miraflores', price: 8.5, color: 'lima' as const, active: true, coordinates: triangle };

// Plays the role of the page: it owns the points and the color that the map draws
function Harness({
  zone,
  initialPoints = [],
  onCancel,
  onSaved,
  mapFailed = false,
}: {
  zone?: typeof existing;
  initialPoints?: ZonePoint[];
  onCancel: () => void;
  onSaved: (message: string, id: number) => void;
  mapFailed?: boolean;
}) {
  const [points, setPoints] = useState<ZonePoint[]>(zone?.coordinates ?? initialPoints);
  const [color, setColor] = useState<ZoneColorId>(zone?.color ?? 'celeste');
  return (
    <>
      <output data-testid="points">{points.length}</output>
      <output data-testid="color">{color}</output>
      <button onClick={() => setPoints(triangle)}>dibujar triángulo</button>
      <button onClick={() => setPoints(bowtie)}>dibujar moño</button>
      <button onClick={() => setPoints(triangle.slice(0, 2))}>dibujar dos puntos</button>
      <ZoneForm
        zone={zone}
        points={points}
        color={color}
        mapFailed={mapFailed}
        onPointsChange={setPoints}
        onColorChange={setColor}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    </>
  );
}

function renderForm(zone?: typeof existing, extra: { mapFailed?: boolean } = {}) {
  const onCancel = vi.fn();
  const onSaved = vi.fn();
  render(
    <QueryWrapper>
      <Harness zone={zone} onCancel={onCancel} onSaved={onSaved} {...extra} />
    </QueryWrapper>,
  );
  return { onCancel, onSaved, user: userEvent.setup() };
}

function conflict(field: string, message: string) {
  return new AxiosError('x', '409', undefined, undefined, {
    status: 409,
    data: { fieldErrors: [{ field, message }] },
  } as AxiosResponse);
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Surco');
  await user.type(screen.getByLabelText('Tarifa (S/)'), '9.50');
  await user.click(screen.getByRole('button', { name: 'dibujar triángulo' }));
}

describe('ZoneForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('al crear abre vacío, con un color elegido y la zona activa', () => {
    renderForm();

    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(screen.getByLabelText('Tarifa (S/)')).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'Celeste' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Zona activa' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('crea la zona con lo escrito y avisa', async () => {
    vi.mocked(zoneApi.createDeliveryZone).mockResolvedValue({ ...existing, id: 9 });
    const { user, onSaved } = renderForm();
    await fillValid(user);
    await user.click(screen.getByRole('radio', { name: 'Coral' }));

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Zona agregada', 9));
    expect(zoneApi.createDeliveryZone).toHaveBeenCalledWith({
      name: 'Surco',
      price: 9.5,
      color: 'coral',
      active: true,
      coordinates: triangle,
    });
  });

  it('el color elegido se comunica para dibujar el polígono con él', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Naranja' }));

    expect(screen.getByTestId('color')).toHaveTextContent('naranja');
  });

  it.each(['0', '-1', '100', '8.999', 'abc'])('la tarifa %s no se envía', async (price) => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Surco');
    await user.type(screen.getByLabelText('Tarifa (S/)'), price);
    await user.click(screen.getByRole('button', { name: 'dibujar triángulo' }));

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/La tarifa debe ser mayor que 0|Usa un monto válido/)).toBeInTheDocument();
    expect(zoneApi.createDeliveryZone).not.toHaveBeenCalled();
  });

  it('sin nombre ni polígono completo muestra qué falta y no envía', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Tarifa (S/)'), '5');
    await user.click(screen.getByRole('button', { name: 'dibujar dos puntos' }));

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Dibuja al menos 3 puntos en el mapa.')).toBeInTheDocument();
    expect(zoneApi.createDeliveryZone).not.toHaveBeenCalled();
  });

  it('un nombre de más de 60 caracteres no se envía', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'a'.repeat(61));
    await user.type(screen.getByLabelText('Tarifa (S/)'), '5');
    await user.click(screen.getByRole('button', { name: 'dibujar triángulo' }));

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Usa 60 caracteres como máximo.')).toBeInTheDocument();
    expect(zoneApi.createDeliveryZone).not.toHaveBeenCalled();
  });

  it('un polígono con lados cruzados muestra el aviso y no se envía', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Surco');
    await user.type(screen.getByLabelText('Tarifa (S/)'), '5');
    await user.click(screen.getByRole('button', { name: 'dibujar moño' }));

    expect(await screen.findByText('Los lados de la zona no pueden cruzarse.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(zoneApi.createDeliveryZone).not.toHaveBeenCalled();
  });

  it('el nombre repetido se muestra bajo el campo y conserva lo escrito y el dibujo', async () => {
    vi.mocked(zoneApi.createDeliveryZone).mockRejectedValue(conflict('name', 'Ya existe una zona con ese nombre.'));
    const { user, onSaved } = renderForm();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya existe una zona con ese nombre.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Surco');
    expect(screen.getByTestId('points')).toHaveTextContent('3');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('otro error muestra el mensaje genérico y conserva el dibujo', async () => {
    vi.mocked(zoneApi.createDeliveryZone).mockRejectedValue(new Error('x'));
    const { user } = renderForm();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No pudimos guardar la zona, intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByTestId('points')).toHaveTextContent('3');
  });

  it('al editar carga los valores y "Guardar" espera un cambio', async () => {
    const { user } = renderForm(existing);

    expect(screen.getByLabelText('Nombre')).toHaveValue('Miraflores');
    expect(screen.getByLabelText('Tarifa (S/)')).toHaveValue('8.50');
    expect(screen.getByRole('radio', { name: 'Lima' })).toBeChecked();
    expect(screen.getByTestId('points')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Coral' }));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('apagar la zona activa se envía como estado', async () => {
    vi.mocked(zoneApi.updateDeliveryZone).mockResolvedValue({ ...existing, active: false });
    const { user, onSaved } = renderForm(existing);

    await user.click(screen.getByRole('switch', { name: 'Zona activa' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Zona actualizada', 7));
    expect(zoneApi.updateDeliveryZone).toHaveBeenCalledWith(7, expect.objectContaining({ active: false, price: 8.5 }));
  });

  it('cambiar el polígono habilita guardar y volver al original lo deshabilita', async () => {
    const { user } = renderForm(existing);

    await user.click(screen.getByRole('button', { name: 'dibujar moño' }));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'dibujar triángulo' }));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('Deshacer quita el último punto y Reiniciar vacía el dibujo', async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'dibujar triángulo' }));

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByTestId('points')).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByTestId('points')).toHaveTextContent('0');
  });

  it('cancelar avisa sin guardar', async () => {
    const { user, onCancel } = renderForm(existing);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
    expect(zoneApi.updateDeliveryZone).not.toHaveBeenCalled();
  });

  it('si el mapa falló no deja guardar', async () => {
    const { user } = renderForm(existing, { mapFailed: true });
    await user.click(screen.getByRole('radio', { name: 'Coral' }));

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});
