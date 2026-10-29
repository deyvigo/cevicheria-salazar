import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as addressApi from '@/features/perfil/address-api';
import { AddressDialog } from '@/features/perfil/components/address-dialog';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/address-api');
vi.mock('@/features/perfil/components/location-picker', () => ({
  LocationPicker: ({
    value,
    onChange,
    onTilesFailed,
  }: {
    value: { latitude: number; longitude: number };
    onChange: (location: { latitude: number; longitude: number }) => void;
    onTilesFailed: () => void;
  }) => (
    <div>
      <p data-testid="coordinates">{`${value.latitude},${value.longitude}`}</p>
      <button type="button" onClick={() => onChange({ latitude: -12.1, longitude: -77.1 })}>
        Mover marcador
      </button>
      <button type="button" onClick={onTilesFailed}>
        Fallar mapa
      </button>
    </div>
  ),
}));

const casa = {
  id: 5,
  label: 'Casa',
  address: 'Av. Arequipa 123',
  reference: 'Frente al parque',
  latitude: -12.09,
  longitude: -77.03,
};

function renderDialog(address?: typeof casa, onClose = vi.fn(), onSaved = vi.fn()) {
  render(
    <QueryWrapper>
      <AddressDialog open address={address} onClose={onClose} onSaved={onSaved} />
    </QueryWrapper>,
  );
  return { onClose, onSaved };
}

function serverError(status: number, data: object) {
  return new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as never);
}

describe('AddressDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('al agregar abre vacío con el marcador en el Centro de Lima', async () => {
    renderDialog();

    expect(await screen.findByRole('heading', { name: 'Agregar dirección' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la dirección')).toHaveValue('');
    expect(screen.getByLabelText('Dirección')).toHaveValue('');
    expect(await screen.findByTestId('coordinates')).toHaveTextContent('-12.0464,-77.0428');
  });

  it('no envía con nombre o dirección vacíos ni con textos demasiado largos', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(await screen.findByLabelText('Referencia (opcional)'), 'x'.repeat(201));
    await user.type(screen.getByLabelText('Nombre de la dirección'), ' ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La dirección es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Usa 200 caracteres como máximo.')).toBeInTheDocument();
    expect(addressApi.createAddress).not.toHaveBeenCalled();
  });

  it('crea con las coordenadas por defecto si no se mueve el marcador', async () => {
    vi.mocked(addressApi.createAddress).mockResolvedValue({ ...casa, id: 9 });
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    await user.type(await screen.findByLabelText('Nombre de la dirección'), ' Casa ');
    await user.type(screen.getByLabelText('Dirección'), 'Av. Arequipa 123');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(addressApi.createAddress).toHaveBeenCalledWith({
        label: 'Casa',
        address: 'Av. Arequipa 123',
        reference: null,
        latitude: -12.0464,
        longitude: -77.0428,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith('Dirección agregada', expect.objectContaining({ id: expect.any(Number) }));
  });

  it('envía las coordenadas nuevas si se mueve el marcador', async () => {
    vi.mocked(addressApi.createAddress).mockResolvedValue({ ...casa, id: 9 });
    const user = userEvent.setup();
    renderDialog();

    await user.type(await screen.findByLabelText('Nombre de la dirección'), 'Trabajo');
    await user.type(screen.getByLabelText('Dirección'), 'Jr. Unión 1');
    await user.click(await screen.findByRole('button', { name: 'Mover marcador' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(addressApi.createAddress).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -12.1, longitude: -77.1 }),
      ),
    );
  });

  it('al editar carga los valores y "Guardar" está deshabilitado hasta cambiar algo', async () => {
    const user = userEvent.setup();
    renderDialog(casa);

    expect(await screen.findByRole('heading', { name: 'Editar dirección' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la dirección')).toHaveValue('Casa');
    expect(screen.getByLabelText('Referencia (opcional)')).toHaveValue('Frente al parque');
    expect(await screen.findByTestId('coordinates')).toHaveTextContent('-12.09,-77.03');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Mover marcador' }));

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('al editar guarda los cambios y avisa', async () => {
    vi.mocked(addressApi.updateAddress).mockResolvedValue(casa);
    const user = userEvent.setup();
    const { onSaved } = renderDialog(casa);

    const label = await screen.findByLabelText('Nombre de la dirección');
    await user.clear(label);
    await user.type(label, 'Oficina');
    await user.clear(screen.getByLabelText('Referencia (opcional)'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(addressApi.updateAddress).toHaveBeenCalledWith(5, {
        label: 'Oficina',
        address: 'Av. Arequipa 123',
        reference: null,
        latitude: -12.09,
        longitude: -77.03,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith('Dirección actualizada', expect.objectContaining({ id: expect.any(Number) }));
  });

  it('si el servidor falla, sigue abierto con lo escrito y el mensaje', async () => {
    vi.mocked(addressApi.updateAddress).mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    const { onSaved } = renderDialog(casa);

    const label = await screen.findByLabelText('Nombre de la dirección');
    await user.clear(label);
    await user.type(label, 'Oficina');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No pudimos guardar la dirección, intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la dirección')).toHaveValue('Oficina');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor cuando se alcanzó el máximo', async () => {
    vi.mocked(addressApi.createAddress).mockRejectedValue(
      serverError(409, { message: 'Alcanzaste el máximo de 10 direcciones guardadas.', fieldErrors: [] }),
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(await screen.findByLabelText('Nombre de la dirección'), 'Casa');
    await user.type(screen.getByLabelText('Dirección'), 'Calle 1');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Alcanzaste el máximo de 10 direcciones guardadas.')).toBeInTheDocument();
  });

  it('si el mapa falla muestra el aviso y no deja guardar', async () => {
    const user = userEvent.setup();
    renderDialog(casa);

    await user.click(await screen.findByRole('button', { name: 'Fallar mapa' }));

    expect(screen.getByText(/No pudimos cargar el mapa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByTestId('coordinates')).toBeInTheDocument();
  });

  it('cerrar con Cancelar no guarda', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog(casa);

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(addressApi.updateAddress).not.toHaveBeenCalled();
  });
});
