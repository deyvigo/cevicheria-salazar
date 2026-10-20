import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoryApi from '@/features/admin/admin-category-api';
import { AdminCategoriesPage } from '@/features/admin/admin-categories-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-category-api');

const ceviches = { id: 1, name: 'Ceviches', slug: 'ceviches', productCount: 3 };
const postres = { id: 2, name: 'Postres', slug: 'postres', productCount: 0 };

function pageOf(items: (typeof ceviches)[], page = 1, totalPages = 1) {
  return { items, page, pageSize: 20, totalItems: items.length, totalPages };
}

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage(url = '/admin/categorias') {
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[url]}>
        <AdminCategoriesPage />
        <Location />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra un estado de carga', () => {
    vi.mocked(categoryApi.listAdminCategories).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText(/Cargando las categorías/)).toBeInTheDocument();
  });

  it('si falla, avisa y "Reintentar" vuelve a cargar', async () => {
    vi.mocked(categoryApi.listAdminCategories)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(pageOf([ceviches]));
    renderPage();

    expect(await screen.findByText('No pudimos cargar las categorías.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ceviches')).toBeInTheDocument();
  });

  it('sin categorías muestra el estado vacío', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([]));
    renderPage();

    expect(await screen.findByText('Aún no tienes categorías')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar categoría' })).toBeInTheDocument();
  });

  it('muestra una tabla con las columnas Nombre, Slug, Platos y Acciones', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches, postres]));
    renderPage();

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Nombre', 'Slug', 'Platos', 'Acciones']);

    const row = within(table).getByRole('row', { name: /Ceviches/ });
    expect(within(row).getByText('/ceviches')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Editar Ceviches' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('"Eliminar" está deshabilitado con platos asociados y el motivo sale en un aviso, no a la vista', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches, postres]));
    renderPage();

    const used = await screen.findByRole('button', { name: 'Eliminar Ceviches' });
    expect(used).toBeDisabled();
    expect(used).toHaveAccessibleDescription(
      'Tiene 3 platos asociados: muévelos a otra categoría antes de eliminarla.',
    );
    expect(screen.getByRole('tooltip')).toHaveClass('invisible', 'opacity-0');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Eliminar Postres' })).toBeEnabled();
  });

  it('con una sola página no hay navegación; con varias sí y cambia ?page=', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValueOnce(pageOf([ceviches]));
    renderPage();
    await screen.findByText('Ceviches');
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('con varias páginas muestra la navegación y pasar de página cambia la URL', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockImplementation(async ({ page }) =>
      page === 2 ? pageOf([postres], 2, 2) : pageOf([ceviches], 1, 2),
    );
    renderPage();

    await screen.findByText('Ceviches');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Postres')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/categorias?page=2');
    expect(categoryApi.listAdminCategories).toHaveBeenCalledWith({ q: undefined, page: 2 });
  });

  it('si la página pedida ya no existe, pasa a la que devuelve el servidor', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([postres], 2, 2));
    renderPage('/admin/categorias?page=3');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/categorias?page=2'));
  });

  it('un ?page= inválido se trata como la página 1', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches]));
    renderPage('/admin/categorias?page=abc');

    await screen.findByText('Ceviches');
    expect(categoryApi.listAdminCategories).toHaveBeenCalledWith({ q: undefined, page: 1 });
  });

  it('"Agregar categoría" abre el diálogo y "Editar" lo abre con los datos', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Agregar categoría' }));
    expect(await screen.findByRole('heading', { name: 'Agregar categoría' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await user.click(screen.getByRole('button', { name: 'Editar Ceviches' }));
    expect(await screen.findByRole('heading', { name: 'Editar categoría' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ceviches');
  });

  it('al eliminar una categoría vacía la quita de la lista y avisa', async () => {
    vi.mocked(categoryApi.listAdminCategories)
      .mockResolvedValueOnce(pageOf([ceviches, postres]))
      .mockResolvedValue(pageOf([ceviches]));
    vi.mocked(categoryApi.deleteCategory).mockResolvedValue();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Eliminar Postres' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Categoría eliminada')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Postres')).not.toBeInTheDocument());
  });

  it('muestra el buscador al lado de "Agregar categoría" y no lo muestra sin categorías', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches]));
    renderPage();

    expect(await screen.findByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar categorías' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar categoría' })).toBeInTheDocument();
  });

  it('sin categorías no hay buscador', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([]));
    renderPage();

    await screen.findByText('Aún no tienes categorías');
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('buscar envía el texto recortado, vuelve a la página 1 y lo deja en la URL', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockImplementation(async ({ q, page }) =>
      q ? pageOf([ceviches], 1, 1) : pageOf([ceviches, postres], page, 3),
    );
    const user = userEvent.setup();
    renderPage('/admin/categorias?page=2');

    await user.type(await screen.findByRole('searchbox', { name: 'Buscar categorías' }), '  CEVICHE ');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(categoryApi.listAdminCategories).toHaveBeenLastCalledWith({ q: 'CEVICHE', page: 1 }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/categorias?q=CEVICHE');
  });

  it('con ?q= en la URL busca y muestra el texto en el buscador', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches]));
    renderPage('/admin/categorias?q=cev');

    expect(await screen.findByRole('searchbox', { name: 'Buscar categorías' })).toHaveValue('cev');
    expect(categoryApi.listAdminCategories).toHaveBeenCalledWith({ q: 'cev', page: 1 });
  });

  it('sin resultados avisa con el texto buscado y deja buscador y botón visibles', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([]));
    renderPage('/admin/categorias?q=zzz');

    expect(await screen.findByText('No se encontraron categorías para «zzz»')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar categoría' })).toBeInTheDocument();
    expect(screen.queryByText('Aún no tienes categorías')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('vaciar el buscador y enviarlo quita ?q= de la URL', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue(pageOf([ceviches]));
    const user = userEvent.setup();
    renderPage('/admin/categorias?q=cev');

    await user.clear(await screen.findByRole('searchbox', { name: 'Buscar categorías' }));
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/categorias$/));
    expect(categoryApi.listAdminCategories).toHaveBeenLastCalledWith({ q: undefined, page: 1 });
  });

  it('al pasar de página conserva la búsqueda', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockImplementation(async ({ page }) =>
      page === 2 ? pageOf([postres], 2, 2) : pageOf([ceviches], 1, 2),
    );
    renderPage('/admin/categorias?q=a');

    await screen.findByText('Ceviches');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/categorias?q=a&page=2'));
    expect(categoryApi.listAdminCategories).toHaveBeenLastCalledWith({ q: 'a', page: 2 });
  });
});
