import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Outlet, RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as catalogApi from '@/features/catalogo/catalog-api';
import type { Page, Product } from '@/features/catalogo/catalog-api';
import { CatalogPage } from '@/features/catalogo/catalog-page';
import { rememberScroll, takeScroll } from '@/features/catalogo/scroll-memory';

vi.mock('@/features/catalogo/catalog-api');

const CATEGORIES = [
  { id: 1, name: 'Entradas', slug: 'entradas' },
  { id: 2, name: 'Ceviches', slug: 'ceviches' },
];

function product(id: number): Product {
  return {
    id,
    name: `Plato ${id}`,
    description: '',
    price: 10,
    rating: null,
    imageUrl: null,
  };
}

function page(pageNumber: number, totalItems: number): Page<Product> {
  const size = 18;
  const start = (pageNumber - 1) * size;
  const count = Math.max(0, Math.min(size, totalItems - start));
  return {
    items: Array.from({ length: count }, (_, i) => product(start + i + 1)),
    page: pageNumber,
    pageSize: size,
    totalItems,
    totalPages: Math.ceil(totalItems / size),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Outlet />
            <LocationProbe />
          </>
        ),
        children: [
          { path: '/menu', element: <CatalogPage /> },
          { path: '/menu/:category', element: <CatalogPage /> },
        ],
      },
    ],
    { initialEntries: [url] },
  );
  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>,
  );
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogApi.getCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(catalogApi.getProducts).mockImplementation(async ({ page: n }) => page(n, 40));
    window.scrollTo = vi.fn();
    takeScroll('');
  });

  it('restaura el scroll guardado al volver a la misma lista', async () => {
    rememberScroll('/menu/ceviches', 640);
    renderAt('/menu/ceviches');
    await screen.findByText('Mostrando 1-18 de 40 elementos');

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 640 });
  });

  it('no restaura el scroll guardado de otra lista', async () => {
    rememberScroll('/menu/entradas', 640);
    renderAt('/menu/ceviches');
    await screen.findByText('Mostrando 1-18 de 40 elementos');

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('muestra las categorías con la actual resaltada y el rango de elementos', async () => {
    renderAt('/menu/ceviches');

    expect(await screen.findByText('Mostrando 1-18 de 40 elementos')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ceviches' })).toHaveAttribute('aria-current', 'page');
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: 'ceviches',
      page: 1,
      sort: 'name_asc',
    });
  });

  it('carga la página indicada en ?page= y actualiza el rango', async () => {
    renderAt('/menu/ceviches?page=2');

    expect(await screen.findByText('Mostrando 19-36 de 40 elementos')).toBeInTheDocument();
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: 'ceviches',
      page: 2,
      sort: 'name_asc',
    });
  });

  it('pone la página en la URL al paginar', async () => {
    const user = userEvent.setup();
    renderAt('/menu/ceviches');
    await screen.findByText('Mostrando 1-18 de 40 elementos');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Mostrando 19-36 de 40 elementos')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/menu/ceviches?page=2');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('vuelve a la página 1 al elegir otra categoría', async () => {
    const user = userEvent.setup();
    renderAt('/menu/ceviches?page=2');
    await screen.findByText('Mostrando 19-36 de 40 elementos');

    await user.click(await screen.findByRole('link', { name: 'Entradas' }));

    expect(await screen.findByText('Mostrando 1-18 de 40 elementos')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/menu/entradas');
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=');
  });

  it('sube al inicio al cambiar de categoría', async () => {
    const user = userEvent.setup();
    renderAt('/menu/ceviches');
    await screen.findByText('Mostrando 1-18 de 40 elementos');
    expect(window.scrollTo).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('link', { name: 'Entradas' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('trata una página no numérica como la primera', async () => {
    renderAt('/menu/ceviches?page=abc');

    expect(await screen.findByText('Mostrando 1-18 de 40 elementos')).toBeInTheDocument();
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: 'ceviches',
      page: 1,
      sort: 'name_asc',
    });
  });

  it('muestra "No se encontraron productos" sin resaltar ninguna categoría si no existe', async () => {
    vi.mocked(catalogApi.getProducts).mockResolvedValue(page(1, 0));
    renderAt('/menu/pizzas');

    expect(await screen.findByText('No se encontraron productos.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ceviches' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it('ordena por el criterio elegido, lo pone en la URL y vuelve a la página 1', async () => {
    const user = userEvent.setup();
    renderAt('/menu/ceviches?page=2');
    await screen.findByText('Mostrando 19-36 de 40 elementos');

    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'price_desc');

    expect(await screen.findByText('Mostrando 1-18 de 40 elementos')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/menu/ceviches?sort=price_desc');
    expect(catalogApi.getProducts).toHaveBeenLastCalledWith({
      category: 'ceviches',
      page: 1,
      sort: 'price_desc',
    });
  });

  it('conserva el orden al cambiar de página', async () => {
    const user = userEvent.setup();
    renderAt('/menu/ceviches?sort=rating_desc');
    await screen.findByText('Mostrando 1-18 de 40 elementos');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    await screen.findByText('Mostrando 19-36 de 40 elementos');
    expect(screen.getByTestId('location')).toHaveTextContent('/menu/ceviches?sort=rating_desc&page=2');
    expect(catalogApi.getProducts).toHaveBeenLastCalledWith({
      category: 'ceviches',
      page: 2,
      sort: 'rating_desc',
    });
  });

  it('usa el orden por defecto cuando ?sort= es desconocido', async () => {
    renderAt('/menu/ceviches?sort=xyz');

    await screen.findByText('Mostrando 1-18 de 40 elementos');
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: 'ceviches',
      page: 1,
      sort: 'name_asc',
    });
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('name_asc');
  });

  it('en /menu muestra "Todos" resaltado y pide los platos sin categoría', async () => {
    renderAt('/menu');

    expect(await screen.findByText('Mostrando 1-18 de 40 elementos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('aria-current', 'page');
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: undefined,
      q: undefined,
      page: 1,
      sort: 'name_asc',
    });
    expect(catalogApi.getCategories).toHaveBeenCalledWith(undefined);
  });

  it('con ?q= pide platos y categorías filtrados y deja "Todos" resaltado', async () => {
    renderAt('/menu?q=ceviche');

    expect(await screen.findByText('Mostrando 1-18 de 40 elementos')).toBeInTheDocument();
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: undefined,
      q: 'ceviche',
      page: 1,
      sort: 'name_asc',
    });
    expect(catalogApi.getCategories).toHaveBeenCalledWith('ceviche');
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('aria-current', 'page');
  });

  it('al elegir una categoría dentro de una búsqueda conserva el término en la URL', async () => {
    const user = userEvent.setup();
    renderAt('/menu?q=ceviche&page=2');
    await screen.findByText('Mostrando 19-36 de 40 elementos');

    await user.click(await screen.findByRole('link', { name: 'Ceviches' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/menu/ceviches?q=ceviche');
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=');
    expect(catalogApi.getProducts).toHaveBeenLastCalledWith({
      category: 'ceviches',
      q: 'ceviche',
      page: 1,
      sort: 'name_asc',
    });
  });

  it('conserva el término al paginar y al ordenar', async () => {
    const user = userEvent.setup();
    renderAt('/menu?q=ceviche');
    await screen.findByText('Mostrando 1-18 de 40 elementos');

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText('Mostrando 19-36 de 40 elementos');
    expect(screen.getByTestId('location')).toHaveTextContent('/menu?q=ceviche&page=2');

    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'price_desc');
    await screen.findByText('Mostrando 1-18 de 40 elementos');
    expect(screen.getByTestId('location')).toHaveTextContent('/menu?q=ceviche&sort=price_desc');
  });

  it('sin coincidencias muestra "No se encontraron productos" y solo "Todos"', async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValue([]);
    vi.mocked(catalogApi.getProducts).mockResolvedValue(page(1, 0));
    renderAt('/menu?q=pizza');

    expect(await screen.findByText('No se encontraron productos.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ceviches' })).not.toBeInTheDocument();
  });

  it('trata ?q= con solo espacios como sin búsqueda', async () => {
    renderAt('/menu?q=%20%20');

    await screen.findByText('Mostrando 1-18 de 40 elementos');
    expect(catalogApi.getProducts).toHaveBeenCalledWith({
      category: undefined,
      q: undefined,
      page: 1,
      sort: 'name_asc',
    });
  });
});
