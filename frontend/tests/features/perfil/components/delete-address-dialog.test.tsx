import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as addressApi from '@/features/perfil/address-api';
import { DeleteAddressDialog } from '@/features/perfil/components/delete-address-dialog';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/address-api');

const casa = { id: 5, label: 'Casa', address: 'Av. Arequipa 123', reference: null, latitude: -12, longitude: -77 };

function renderDialog(onClose = vi.fn(), onDeleted = vi.fn()) {
  render(
    <QueryWrapper>
      <DeleteAddressDialog address={casa} onClose={onClose} onDeleted={onDeleted} />
    </QueryWrapper>,
  );
  return { onClose, onDeleted };
}

describe('DeleteAddressDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra el nombre y la dirección a eliminar', () => {
    renderDialog();

    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText(/Av\. Arequipa 123/)).toBeInTheDocument();
  });

  it('al confirmar elimina y avisa', async () => {
    vi.mocked(addressApi.deleteAddress).mockResolvedValue();
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(addressApi.deleteAddress).toHaveBeenCalledWith(5);
  });

  it('cancelar o Escape no eliminan', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(addressApi.deleteAddress).not.toHaveBeenCalled();
  });

  it('si falla, sigue abierto con el mensaje', async () => {
    vi.mocked(addressApi.deleteAddress).mockRejectedValue(new Error('network'));
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('No pudimos eliminar la dirección, intenta de nuevo.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
