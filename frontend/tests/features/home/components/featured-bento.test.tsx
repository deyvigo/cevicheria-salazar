import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as catalogApi from '@/features/catalogo/catalog-api';
import type { FeaturedProduct } from '@/features/catalogo/catalog-api';
import { useCartStore } from '@/features/carrito/cart-store';
import { FeaturedBento } from '@/features/home/components/featured-bento';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/catalogo/catalog-api');

function dish(id: number, name: string, overrides: Partial<FeaturedProduct> = {}): FeaturedProduct {
  return {
    id,
    name,
    description: 'Rico',
    price: 32,
    rating: null,
    imageUrl: `https://img/${id}.webp`,
    available: true,
    stock: 10,
    bestSeller: false,
    ...overrides,
  };
}

const FIVE = [
  dish(1, 'Ceviche clásico', { bestSeller: true }),
  dish(2, 'Chicharrón de pescado', { bestSeller: true, price: 28.5 }),
  dish(3, 'Leche de tigre'),
  dish(4, 'Arroz con mariscos'),
  dish(5, 'Tiradito'),
];

function renderBento() {
  render(
    <QueryWrapper>
      <MemoryRouter>
        <FeaturedBento />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

function tile(name: string) {
  return screen.getByRole('link', { name }).closest('article') as HTMLElement;
}

describe('FeaturedBento', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useCartStore.setState({ items: [] });
  });

  it('mientras carga muestra cinco casillas de espera', () => {
    vi.mocked(catalogApi.getFeaturedProducts).mockReturnValue(new Promise(() => undefined));
    renderBento();

    expect(screen.getByRole('heading', { level: 2, name: 'Los favoritos de la casa' })).toBeInTheDocument();
    expect(screen.getAllByTestId('featured-skeleton')).toHaveLength(5);
  });

  it('muestra los cinco platos en orden, con precio, enlace al detalle y la etiqueta solo en los vendidos', async () => {
    vi.mocked(catalogApi.getFeaturedProducts).mockResolvedValue(FIVE);
    renderBento();

    const tiles = await screen.findAllByRole('article');
    expect(tiles.map((item) => within(item).getByRole('heading').textContent)).toEqual(FIVE.map((item) => item.name));
    expect(screen.getByRole('link', { name: 'Ceviche clásico' })).toHaveAttribute('href', '/products/1');
    expect(within(tile('Chicharrón de pescado')).getByText('S/ 28.50')).toBeInTheDocument();
    expect(within(tile('Ceviche clásico')).getByText('Más vendido')).toBeInTheDocument();
    expect(within(tile('Chicharrón de pescado')).getByText('Más vendido')).toBeInTheDocument();
    expect(within(tile('Leche de tigre')).queryByText('Más vendido')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver toda la carta' })).toHaveAttribute('href', '/menu');
  });

  it('el botón Agregar pone el plato en el carrito sin salir de la página', async () => {
    const user = userEvent.setup();
    vi.mocked(catalogApi.getFeaturedProducts).mockResolvedValue(FIVE);
    renderBento();

    await screen.findAllByRole('article');
    await user.click(within(tile('Tiradito')).getByRole('button', { name: 'Agregar Tiradito al carrito' }));

    expect(useCartStore.getState().items).toEqual([expect.objectContaining({ productId: 5, quantity: 1 })]);
  });

  it('sin platos, la sección no se muestra', async () => {
    vi.mocked(catalogApi.getFeaturedProducts).mockResolvedValue([]);
    renderBento();

    await vi.waitFor(() => expect(catalogApi.getFeaturedProducts).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.queryByTestId('featured-skeleton')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Los favoritos de la casa' })).not.toBeInTheDocument();
  });

  it('si la carga falla, la sección no se muestra', async () => {
    vi.mocked(catalogApi.getFeaturedProducts).mockRejectedValue(new Error('fail'));
    renderBento();

    await vi.waitFor(() => expect(screen.queryByTestId('featured-skeleton')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Los favoritos de la casa' })).not.toBeInTheDocument();
  });
});
