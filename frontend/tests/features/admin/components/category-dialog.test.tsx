import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoryApi from '@/features/admin/admin-category-api';
import { CategoryDialog } from '@/features/admin/components/category-dialog';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-category-api');

const ceviches = { id: 3, name: 'Ceviches', slug: 'ceviches', productCount: 4 };

function renderDialog(category?: typeof ceviches, onClose = vi.fn(), onSaved = vi.fn()) {
  render(
    <QueryWrapper>
      <CategoryDialog open category={category} onClose={onClose} onSaved={onSaved} />
    </QueryWrapper>,
  );
  return { onClose, onSaved };
}

function serverError(status: number, data: object) {
  return new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as never);
}

describe('CategoryDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('al agregar abre vacío y propone el enlace a partir del nombre', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(await screen.findByRole('heading', { name: 'Agregar categoría' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(screen.getByLabelText('Enlace')).toHaveValue('');

    await user.type(screen.getByLabelText('Nombre'), 'Platos Fríos');

    expect(screen.getByLabelText('Enlace')).toHaveValue('platos-frios');
  });

  it('si se edita el enlace a mano, deja de seguir al nombre', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(await screen.findByLabelText('Nombre'), 'Postres');
    await user.clear(screen.getByLabelText('Enlace'));
    await user.type(screen.getByLabelText('Enlace'), 'dulces');
    await user.type(screen.getByLabelText('Nombre'), ' caseros');

    expect(screen.getByLabelText('Enlace')).toHaveValue('dulces');
  });

  it('no envía con campos vacíos, enlace inválido ni textos demasiado largos', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(await screen.findByLabelText('Nombre'), 'x'.repeat(81));
    await user.clear(screen.getByLabelText('Enlace'));
    await user.type(screen.getByLabelText('Enlace'), 'con espacios');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Usa 80 caracteres como máximo.')).toBeInTheDocument();
    expect(screen.getAllByText('Usa 80 caracteres como máximo.')).toHaveLength(1);
    expect(screen.getByText('Usa solo minúsculas, números y guiones simples.')).toBeInTheDocument();
    expect(categoryApi.createCategory).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Nombre'));
    await user.clear(screen.getByLabelText('Enlace'));
    await user.type(screen.getByLabelText('Nombre'), ' ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El enlace es obligatorio.')).toBeInTheDocument();
  });

  it('crea con los textos recortados y avisa', async () => {
    vi.mocked(categoryApi.createCategory).mockResolvedValue({ id: 9, name: 'Postres', slug: 'postres', productCount: 0 });
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    await user.type(await screen.findByLabelText('Nombre'), ' Postres ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(categoryApi.createCategory).toHaveBeenCalledWith({ name: 'Postres', slug: 'postres' }),
    );
    expect(onSaved).toHaveBeenCalledWith('Categoría agregada');
  });

  it('al editar carga los valores y "Guardar" está deshabilitado hasta cambiar algo', async () => {
    const user = userEvent.setup();
    renderDialog(ceviches);

    expect(await screen.findByRole('heading', { name: 'Editar categoría' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ceviches');
    expect(screen.getByLabelText('Enlace')).toHaveValue('ceviches');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nombre'), 'x');

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('al editar, cambiar el nombre no cambia el enlace', async () => {
    vi.mocked(categoryApi.updateCategory).mockResolvedValue(ceviches);
    const user = userEvent.setup();
    const { onSaved } = renderDialog(ceviches);

    const name = await screen.findByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Ceviches Frescos');

    expect(screen.getByLabelText('Enlace')).toHaveValue('ceviches');
    expect(screen.queryByText('Los enlaces anteriores dejarán de funcionar.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(categoryApi.updateCategory).toHaveBeenCalledWith(3, { name: 'Ceviches Frescos', slug: 'ceviches' }),
    );
    expect(onSaved).toHaveBeenCalledWith('Categoría actualizada');
  });

  it('al editar, cambiar el enlace muestra el aviso y volver al guardado lo oculta', async () => {
    const user = userEvent.setup();
    renderDialog(ceviches);

    const slug = await screen.findByLabelText('Enlace');
    await user.type(slug, '-frescos');

    expect(screen.getByText('Los enlaces anteriores dejarán de funcionar.')).toBeInTheDocument();

    await user.clear(slug);
    await user.type(slug, 'ceviches');

    expect(screen.queryByText('Los enlaces anteriores dejarán de funcionar.')).not.toBeInTheDocument();
  });

  it('muestra bajo el campo el nombre o enlace repetido y deja el diálogo abierto', async () => {
    vi.mocked(categoryApi.createCategory)
      .mockRejectedValueOnce(
        serverError(409, {
          message: 'Ya existe una categoría con ese nombre.',
          fieldErrors: [{ field: 'name', message: 'Ya existe una categoría con ese nombre.' }],
        }),
      )
      .mockRejectedValueOnce(
        serverError(409, {
          message: 'Ya existe una categoría con ese enlace.',
          fieldErrors: [{ field: 'slug', message: 'Ya existe una categoría con ese enlace.' }],
        }),
      );
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    await user.type(await screen.findByLabelText('Nombre'), 'Ceviches');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe una categoría con ese nombre.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ya existe una categoría con ese enlace.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ceviches');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('si el servidor falla, sigue abierto con lo escrito y el mensaje genérico', async () => {
    vi.mocked(categoryApi.updateCategory).mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    const { onSaved } = renderDialog(ceviches);

    const name = await screen.findByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Otro');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No pudimos guardar la categoría, intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Otro');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('Cancelar cierra sin guardar', async () => {
    const { onClose } = renderDialog(ceviches);

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(categoryApi.updateCategory).not.toHaveBeenCalled();
  });
});
