import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as catalogApi from '@/features/catalogo/catalog-api';
import type { ProductDetail } from '@/features/catalogo/catalog-api';
import { ProductDetailPage } from '@/features/catalogo/product-detail-page';

vi.mock('@/features/catalogo/catalog-api');

const DETAIL: ProductDetail = {
  id: 7,
  name: 'Ceviche clásico',
  description: 'Pescado fresco con limón.',
  price: 32,
  rating: 4.5,
  available: true,
  category: { id: 2, name: 'Ceviches', slug: 'ceviches' },
  images: ['http://m/a.jpg', 'http://m/b.jpg'],
};

function renderAt(entry: string | { pathname: string; state: unknown }) {
  const router = createMemoryRouter([{ path: '/products/:id', element: <ProductDetailPage /> }], {
    initialEntries: [entry],
  });
  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>,
  );
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.mocked(catalogApi.getProduct).mockReset();
  });

  it('muestra imagen, nombre, categoría, precio, calificación y descripción', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue(DETAIL);
    renderAt('/products/7');

    const heading = await screen.findByRole('heading', { name: 'Ceviche clásico', level: 1 });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Ceviches')).toBeInTheDocument();
    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Calificación 4.5 de 5')).toBeInTheDocument();
    expect(screen.getByText('Pescado fresco con limón.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ceviche clásico' })).toHaveAttribute('src', 'http://m/a.jpg');
  });

  it('muestra "Disponible" y conserva el resto de datos cuando el plato está disponible', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue(DETAIL);
    renderAt('/products/7');

    expect(await screen.findByText('Disponible')).toBeInTheDocument();
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument();
  });

  it('muestra "Agotado" sin ocultar nombre, precio ni descripción', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue({ ...DETAIL, available: false });
    renderAt('/products/7');

    expect(await screen.findByText('Agotado')).toBeInTheDocument();
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ceviche clásico' })).toBeInTheDocument();
    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
    expect(screen.getByText('Pescado fresco con limón.')).toBeInTheDocument();
  });

  it('no muestra ningún estado mientras la disponibilidad no está confirmada', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue({ ...DETAIL, available: null });
    renderAt('/products/7');

    await screen.findByRole('heading', { name: 'Ceviche clásico' });
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument();
  });

  it('no muestra calificación cuando el plato no tiene', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue({ ...DETAIL, rating: null });
    renderAt('/products/7');

    await screen.findByRole('heading', { name: 'Ceviche clásico' });
    expect(screen.queryByLabelText(/calificación/i)).not.toBeInTheDocument();
  });

  it('"Volver" va al listado del que se vino, con página y orden', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue(DETAIL);
    renderAt({ pathname: '/products/7', state: { from: '/ceviches?page=2&sort=price_desc' } });

    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/ceviches?page=2&sort=price_desc',
    );
  });

  it('sin listado de origen, "Volver" va a la categoría del plato', async () => {
    vi.mocked(catalogApi.getProduct).mockResolvedValue(DETAIL);
    renderAt('/products/7');

    await screen.findByRole('heading', { name: 'Ceviche clásico' });
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/ceviches');
  });

  it('muestra "No encontramos este plato" ante un 404', async () => {
    vi.mocked(catalogApi.getProduct).mockRejectedValue(
      new AxiosError('Not found', 'ERR_BAD_REQUEST', undefined, undefined, { status: 404 } as never),
    );
    renderAt('/products/999');

    expect(await screen.findByText('No encontramos este plato.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/');
  });

  it('con un id no numérico muestra el mismo mensaje sin llamar a la API', () => {
    renderAt('/products/abc');

    expect(screen.getByText('No encontramos este plato.')).toBeInTheDocument();
    expect(catalogApi.getProduct).not.toHaveBeenCalled();
  });

  it('muestra un error recuperable cuando falla la red', async () => {
    vi.mocked(catalogApi.getProduct).mockRejectedValue(new Error('network'));
    renderAt('/products/7');

    expect(await screen.findByText('No pudimos cargar el plato. Intenta de nuevo.')).toBeInTheDocument();
  });
});
