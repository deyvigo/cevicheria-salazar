import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as productApi from '@/features/admin/admin-product-api';
import { ProductDialog } from '@/features/admin/components/product-dialog';
import * as catalogApi from '@/features/catalogo/catalog-api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-product-api');
vi.mock('@/features/catalogo/catalog-api');

const categories = [
  { id: 1, name: 'Entradas', slug: 'entradas' },
  { id: 2, name: 'Ceviches', slug: 'ceviches' },
];

const ceviche = {
  id: 4,
  name: 'Ceviche mixto',
  description: 'Fresco',
  price: 32,
  rating: null,
  categoryId: 2,
  categoryName: 'Ceviches',
  stock: 5,
  active: true,
  available: true,
  images: [
    { id: 10, url: 'https://media/10.jpg' },
    { id: 11, url: 'https://media/11.jpg' },
  ],
};

function renderDialog(product?: typeof ceviche, onClose = vi.fn(), onSaved = vi.fn()) {
  render(
    <QueryWrapper>
      <MemoryRouter>
        <ProductDialog open product={product} onClose={onClose} onSaved={onSaved} />
      </MemoryRouter>
    </QueryWrapper>,
  );
  return { onClose, onSaved };
}

function serverError(status: number, data: object) {
  return new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as never);
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Nombre'), ' Leche de tigre ');
  await user.type(screen.getByLabelText('Descripción'), 'Con ají limo');
  await screen.findByRole('option', { name: 'Ceviches' });
  await user.selectOptions(screen.getByLabelText('Categoría'), 'Ceviches');
  await user.type(screen.getByLabelText('Precio (S/)'), '12.5');
  await user.clear(screen.getByLabelText('Stock'));
  await user.type(screen.getByLabelText('Stock'), '8');
  await user.upload(
    screen.getByLabelText('Archivos de imagen'),
    new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
  );
}

describe('ProductDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(catalogApi.getCategories).mockResolvedValue(categories);
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('al agregar abre vacío con Activo y Disponible desactivados', async () => {
    renderDialog();

    expect(await screen.findByRole('heading', { name: 'Agregar plato' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(screen.getByLabelText('Activo')).not.toBeChecked();
    expect(screen.getByLabelText('Disponible')).not.toBeChecked();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('no envía con campos vacíos, fuera de rango ni sin imágenes', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La descripción es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Elige una categoría.')).toBeInTheDocument();
    expect(screen.getByText('El precio es obligatorio.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Precio (S/)'), '10000');
    await user.clear(screen.getByLabelText('Stock'));
    await user.type(screen.getByLabelText('Stock'), '-1');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ingresa un precio entre 0 y 9999.99 con hasta dos decimales.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa un stock entero entre 0 y 9999.')).toBeInTheDocument();
    expect(productApi.createProduct).not.toHaveBeenCalled();
  });

  it('con todo válido pero sin imágenes pide al menos una', async () => {
    const user = userEvent.setup();
    renderDialog();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Quitar imagen 1' }));

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Agrega al menos una imagen.')).toBeInTheDocument();
    expect(productApi.createProduct).not.toHaveBeenCalled();
  });

  it('crea con los textos recortados y avisa', async () => {
    vi.mocked(productApi.createProduct).mockResolvedValue(ceviche);
    const user = userEvent.setup();
    const { onSaved } = renderDialog();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(productApi.createProduct).toHaveBeenCalledTimes(1));
    const [payload, images] = vi.mocked(productApi.createProduct).mock.calls[0];
    expect(payload).toEqual({
      name: 'Leche de tigre',
      description: 'Con ají limo',
      price: 12.5,
      categoryId: 2,
      stock: 8,
      active: false,
      available: false,
    });
    expect(images).toHaveLength(1);
    expect(images[0].file?.name).toBe('foto.jpg');
    expect(onSaved).toHaveBeenCalledWith('Plato agregado');
  });

  it('al editar carga los valores y "Guardar" se habilita al cambiar algo, también el orden de las imágenes', async () => {
    const user = userEvent.setup();
    renderDialog(ceviche);

    expect(await screen.findByRole('heading', { name: 'Editar plato' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ceviche mixto');
    expect(screen.getByLabelText('Precio (S/)')).toHaveValue('32.00');
    expect(screen.getByLabelText('Stock')).toHaveValue('5');
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[1]);
    fireEvent.drop(items[0]);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();

    const reordered = screen.getAllByRole('listitem');
    fireEvent.dragStart(reordered[1]);
    fireEvent.drop(reordered[0]);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.click(screen.getByLabelText('Disponible'));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('al editar envía la lista final de imágenes y avisa', async () => {
    vi.mocked(productApi.updateProduct).mockResolvedValue(ceviche);
    const user = userEvent.setup();
    const { onSaved } = renderDialog(ceviche);

    const items = await screen.findAllByRole('listitem');
    fireEvent.dragStart(items[1]);
    fireEvent.drop(items[0]);
    await user.click(screen.getByLabelText('Activo'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(productApi.updateProduct).toHaveBeenCalledTimes(1));
    const [id, payload, images] = vi.mocked(productApi.updateProduct).mock.calls[0];
    expect(id).toBe(4);
    expect(payload).toMatchObject({ name: 'Ceviche mixto', price: 32, active: false, available: true });
    expect(images.map((image) => image.id)).toEqual([11, 10]);
    expect(onSaved).toHaveBeenCalledWith('Plato actualizado');
  });

  it('si el servidor falla muestra el error y conserva lo escrito y las imágenes', async () => {
    vi.mocked(productApi.createProduct).mockRejectedValue(serverError(500, {}));
    const user = userEvent.setup();
    const { onSaved } = renderDialog();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No pudimos guardar el plato, intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue(' Leche de tigre ');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('muestra el error de un campo que devuelve el servidor', async () => {
    vi.mocked(productApi.createProduct).mockRejectedValue(
      serverError(400, { fieldErrors: [{ field: 'images', message: 'Solo JPG, PNG o WebP de hasta 5 MB.' }] }),
    );
    const user = userEvent.setup();
    renderDialog();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Solo JPG, PNG o WebP de hasta 5 MB.')).toBeInTheDocument();
  });

  it('sin categorías avisa y no permite guardar', async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValue([]);
    renderDialog();

    expect(await screen.findByRole('link', { name: 'Crea una primero' })).toHaveAttribute('href', '/admin/categorias');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});
