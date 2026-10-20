import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as productApi from '@/features/admin/admin-product-api';
import { DeleteProductDialog } from '@/features/admin/components/delete-product-dialog';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-product-api');

const ceviche = {
  id: 4,
  name: 'Ceviche mixto',
  description: 'Fresco',
  price: 32,
  rating: null,
  categoryId: 1,
  categoryName: 'Ceviches',
  stock: 5,
  active: true,
  available: true,
  images: [],
};

function renderDialog(onClose = vi.fn(), onDeleted = vi.fn()) {
  render(
    <QueryWrapper>
      <DeleteProductDialog product={ceviche} onClose={onClose} onDeleted={onDeleted} />
    </QueryWrapper>,
  );
  return { onClose, onDeleted };
}

describe('DeleteProductDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra el nombre y, al confirmar, elimina y avisa', async () => {
    vi.mocked(productApi.deleteProduct).mockResolvedValue(undefined);
    const { onDeleted } = renderDialog();

    expect(await screen.findByText('Ceviche mixto')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(productApi.deleteProduct).toHaveBeenCalledWith(4));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(ceviche));
  });

  it('cancelar y Escape cierran sin llamar a la API', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(productApi.deleteProduct).not.toHaveBeenCalled();
  });

  it('si falla, muestra el error y no avisa de éxito', async () => {
    vi.mocked(productApi.deleteProduct).mockRejectedValue(new Error('fail'));
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('No pudimos eliminar el plato, intenta de nuevo.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
