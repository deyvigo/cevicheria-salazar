import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoryApi from '@/features/admin/admin-category-api';
import { DeleteCategoryDialog } from '@/features/admin/components/delete-category-dialog';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-category-api');

const postres = { id: 5, name: 'Postres', slug: 'postres', productCount: 0 };

function renderDialog(onClose = vi.fn(), onDeleted = vi.fn()) {
  render(
    <QueryWrapper>
      <DeleteCategoryDialog category={postres} onClose={onClose} onDeleted={onDeleted} />
    </QueryWrapper>,
  );
  return { onClose, onDeleted };
}

describe('DeleteCategoryDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra el nombre de la categoría a eliminar', () => {
    renderDialog();

    expect(screen.getByText('Postres')).toBeInTheDocument();
  });

  it('al confirmar elimina y avisa', async () => {
    vi.mocked(categoryApi.deleteCategory).mockResolvedValue();
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(postres));
    expect(categoryApi.deleteCategory).toHaveBeenCalledWith(5);
  });

  it('cancelar o Escape no eliminan', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(categoryApi.deleteCategory).not.toHaveBeenCalled();
  });

  it('si la categoría ya tiene platos, explica el motivo', async () => {
    vi.mocked(categoryApi.deleteCategory).mockRejectedValue(
      new AxiosError('fail', 'ERR', undefined, undefined, {
        status: 409,
        data: { message: 'No se puede eliminar: tiene platos asociados.' },
      } as never),
    );
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('No se puede eliminar: tiene platos asociados.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('si falla por otro motivo, sigue abierto con el mensaje genérico', async () => {
    vi.mocked(categoryApi.deleteCategory).mockRejectedValue(new Error('network'));
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('No pudimos eliminar la categoría, intenta de nuevo.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
