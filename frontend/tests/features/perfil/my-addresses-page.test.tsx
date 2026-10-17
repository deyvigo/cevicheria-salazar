import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as addressApi from '@/features/perfil/address-api';
import { MyAddressesPage } from '@/features/perfil/my-addresses-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/address-api');
vi.mock('@/features/perfil/components/location-picker', () => ({ LocationPicker: () => <div>mapa</div> }));

const casa = {
  id: 1,
  label: 'Casa',
  address: 'Av. Arequipa 123',
  reference: 'Frente al parque',
  latitude: -12.09,
  longitude: -77.03,
};
const trabajo = { ...casa, id: 2, label: 'Trabajo', address: 'Jr. Unión 1', reference: null };

function renderPage() {
  render(
    <QueryWrapper>
      <MyAddressesPage />
    </QueryWrapper>,
  );
}

describe('MyAddressesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra un estado de carga', () => {
    vi.mocked(addressApi.listAddresses).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText(/Cargando tus direcciones/)).toBeInTheDocument();
  });

  it('si falla, avisa y "Reintentar" vuelve a cargar', async () => {
    vi.mocked(addressApi.listAddresses).mockRejectedValueOnce(new Error('network')).mockResolvedValue([casa]);
    renderPage();

    expect(await screen.findByText('No pudimos cargar tus direcciones.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Av. Arequipa 123')).toBeInTheDocument();
  });

  it('sin direcciones muestra el estado vacío con la opción de agregar', async () => {
    vi.mocked(addressApi.listAddresses).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Aún no tienes direcciones guardadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agregar dirección' }));

    expect(await screen.findByRole('heading', { name: 'Agregar dirección' })).toBeInTheDocument();
  });

  it('lista nombre, dirección y referencia solo si existe', async () => {
    vi.mocked(addressApi.listAddresses).mockResolvedValue([casa, trabajo]);
    renderPage();

    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]).getByText('Casa')).toBeInTheDocument();
    expect(within(items[0]).getByText('Frente al parque')).toBeInTheDocument();
    expect(within(items[1]).getByText('Jr. Unión 1')).toBeInTheDocument();
    expect(within(items[1]).queryByText('Frente al parque')).not.toBeInTheDocument();
  });

  it('"Editar" abre el diálogo con los datos de esa dirección', async () => {
    vi.mocked(addressApi.listAddresses).mockResolvedValue([casa, trabajo]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Editar Trabajo' }));

    expect(await screen.findByRole('heading', { name: 'Editar dirección' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la dirección')).toHaveValue('Trabajo');
  });

  it('eliminar pide confirmación y quita la tarjeta', async () => {
    vi.mocked(addressApi.listAddresses).mockResolvedValueOnce([casa, trabajo]).mockResolvedValue([trabajo]);
    vi.mocked(addressApi.deleteAddress).mockResolvedValue();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Eliminar Casa' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(screen.getByText('Dirección eliminada')).toBeInTheDocument();
    expect(screen.getByText('Av. Arequipa 123').closest('.opacity-0')).not.toBeNull();
    await waitFor(() => expect(screen.queryByText('Av. Arequipa 123')).not.toBeInTheDocument());
    expect(screen.getByText('Jr. Unión 1')).toBeInTheDocument();
  });

  it('con 10 direcciones deshabilita "Agregar dirección" y avisa', async () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({ ...casa, id: index + 1 }));
    vi.mocked(addressApi.listAddresses).mockResolvedValue(ten);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Agregar dirección' })).toBeDisabled();
    expect(screen.getByText(/Alcanzaste el máximo de 10 direcciones/)).toBeInTheDocument();
  });
});
