import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as productApi from '@/features/admin/admin-product-api';
import { AdminProductsPage } from '@/features/admin/admin-products-page';
import * as catalogApi from '@/features/catalogo/catalog-api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-product-api');
vi.mock('@/features/catalogo/catalog-api');

const ceviche: productApi.AdminProduct = {
  id: 1,
  name: 'Ceviche mixto',
  description: 'Fresco',
  price: 32,
  rating: 4.5,
  categoryId: 2,
  categoryName: 'Ceviches',
  stock: 5,
  active: true,
  available: false,
  images: [{ id: 10, url: 'https://media/10.jpg' }],
};
const chicha = { ...ceviche, id: 2, name: 'Chicha', price: 8.5, rating: null, stock: 0, active: false, available: true, images: [] };

function pageOf(items: productApi.AdminProduct[], page = 1, totalPages = 1) {
  return { items, page, pageSize: 20, totalItems: items.length, totalPages };
}

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage(url = '/admin/platos') {
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[url]}>
        <AdminProductsPage />
        <Location />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

describe('AdminProductsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(catalogApi.getCategories).mockResolvedValue([]);
  });

  it('muestra un estado de carga', () => {
    vi.mocked(productApi.listAdminProducts).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText(/Cargando los platos/)).toBeInTheDocument();
  });

  it('si falla, avisa y "Reintentar" vuelve a cargar', async () => {
    vi.mocked(productApi.listAdminProducts)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(pageOf([ceviche]));
    renderPage();

    expect(await screen.findByText('No pudimos cargar los platos.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ceviche mixto')).toBeInTheDocument();
  });

  it('sin platos muestra el estado vacío sin buscador', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([]));
    renderPage();

    expect(await screen.findByText('Aún no tienes platos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar plato' })).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('muestra la tabla con sus columnas, precio, Sí/No y la imagen de reemplazo', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche, chicha]));
    renderPage();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Imagen',
      'Nombre',
      'Categoría',
      'Precio',
      'Stock',
      'Rating',
      'Activo',
      'Disponible',
      'Acciones',
    ]);
    const row = within(table).getByRole('row', { name: /Ceviche mixto/ });
    expect(within(row).getByText('S/ 32.00')).toBeInTheDocument();
    expect(within(row).getByText('Ceviches')).toBeInTheDocument();
    expect(within(row).getByText('4.5')).toBeInTheDocument();
    expect(within(row).getByRole('switch', { name: 'Activo: Ceviche mixto' })).toBeChecked();
    expect(within(row).getByRole('switch', { name: 'Disponible: Ceviche mixto' })).not.toBeChecked();
    expect(within(table).getByRole('row', { name: /Chicha/ })).toHaveTextContent('—');
    expect(within(row).getByRole('button', { name: 'Eliminar Ceviche mixto' })).toBeEnabled();
    expect(row.querySelector('img')).toHaveAttribute('src', 'https://media/10.jpg');
    expect(within(table).getByRole('row', { name: /Chicha/ }).querySelector('img')).toHaveAttribute(
      'src',
      '/dish-placeholder.svg',
    );
  });

  it('con una sola página no hay navegación y con varias se pasa de página en la URL', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche]));
    renderPage();
    await screen.findByRole('table');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('pasar de página cambia ?page=', async () => {
    vi.mocked(productApi.listAdminProducts).mockImplementation(async ({ page }) => pageOf([ceviche], page, 2));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?page=2');
  });

  it('si ?page= ya no existe, reemplaza por la última página', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche], 2, 2));
    renderPage('/admin/platos?page=5');

    await screen.findByRole('table');

    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?page=2');
  });

  it('buscar escribe ?q= y quita la página; sin resultados lo dice', async () => {
    vi.mocked(productApi.listAdminProducts).mockImplementation(async ({ q }) =>
      q ? pageOf([]) : pageOf([ceviche], 1, 2),
    );
    renderPage('/admin/platos?page=2');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('searchbox', { name: 'Buscar platos' }), 'sopa{Enter}');

    expect(await screen.findByText('No se encontraron platos para «sopa»')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?q=sopa');
    expect(screen.getByRole('searchbox', { name: 'Buscar platos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar plato' })).toBeInTheDocument();
  });

  it('ordena por nombre ascendente por defecto y lo marca en el encabezado', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche]));
    renderPage();

    await screen.findByRole('table');

    expect(productApi.listAdminProducts).toHaveBeenCalledWith({ q: undefined, page: 1, sort: 'name', dir: 'asc' });
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Precio' })).not.toHaveAttribute('aria-sort');
  });

  it('un clic ordena ascendente, otro lo invierte, y cambiar de columna vuelve a ascendente desde la página 1', async () => {
    vi.mocked(productApi.listAdminProducts).mockImplementation(async ({ page }) => pageOf([ceviche], page, 2));
    renderPage('/admin/platos?page=2');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Precio' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?sort=price');
    expect(await screen.findByRole('columnheader', { name: 'Precio' })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: 'Precio' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?sort=price&dir=desc');
    expect(await screen.findByRole('columnheader', { name: 'Precio' })).toHaveAttribute('aria-sort', 'descending');
    expect(productApi.listAdminProducts).toHaveBeenLastCalledWith({ q: undefined, page: 1, sort: 'price', dir: 'desc' });

    await user.click(screen.getByRole('button', { name: 'Rating' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?sort=rating');
  });

  it('volver a Nombre ascendente quita el orden de la URL y buscar conserva el orden', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche]));
    renderPage('/admin/platos?sort=stock&dir=desc');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('searchbox', { name: 'Buscar platos' }), 'ce{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?q=ce&sort=stock&dir=desc');

    await user.click(screen.getByRole('button', { name: 'Nombre' }));
    await user.click(screen.getByRole('button', { name: 'Stock' }));
    await user.click(screen.getByRole('button', { name: 'Nombre' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/platos?q=ce');
    expect(screen.getByTestId('location')).not.toHaveTextContent('sort=');
  });

  it('un switch cambia el estado del plato guardando sus demás datos e imágenes', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche]));
    let finish: (product: productApi.AdminProduct) => void = () => undefined;
    vi.mocked(productApi.updateProduct).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('switch', { name: 'Disponible: Ceviche mixto' }));

    // Shown as changed (and locked) while the request is in flight
    expect(screen.getByRole('switch', { name: 'Disponible: Ceviche mixto' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Disponible: Ceviche mixto' })).toBeDisabled();
    finish(ceviche);
    await waitFor(() => expect(productApi.updateProduct).toHaveBeenCalledTimes(1));
    expect(productApi.updateProduct).toHaveBeenCalledWith(
      1,
      {
        name: 'Ceviche mixto',
        description: 'Fresco',
        price: 32,
        categoryId: 2,
        stock: 5,
        active: true,
        available: true,
      },
      [{ key: 'saved-10', id: 10, url: 'https://media/10.jpg' }],
    );
  });

  it('si no se puede guardar, el switch vuelve a su estado y avisa', async () => {
    vi.mocked(productApi.listAdminProducts).mockResolvedValue(pageOf([ceviche]));
    vi.mocked(productApi.updateProduct).mockRejectedValue(new Error('fail'));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('switch', { name: 'Activo: Ceviche mixto' }));

    expect(await screen.findByText('No pudimos actualizar el plato, intenta de nuevo')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Activo: Ceviche mixto' })).toBeChecked();
  });
});
