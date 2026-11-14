import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as cartApi from '@/features/carrito/cart-api';
import { CartPopover } from '@/features/carrito/components/cart-popover';
import { useCartStore } from '@/features/carrito/cart-store';
import type { Product } from '@/features/catalogo/catalog-api';

vi.mock('@/features/carrito/cart-api');

const product = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Plato ${id}`,
  description: '',
  price: 10 + id,
  rating: null,
  imageUrl: null,
  available: true,
  stock: 10,
  ...overrides,
});

function renderPopover() {
  return render(
    <MemoryRouter>
      <QueryWrapper>
        <CartPopover />
      </QueryWrapper>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(cartApi.getProductsByIds).mockReset();
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null, lastRemoved: null, lastCleared: null });
});

describe('CartPopover', () => {
  it('muestra una fila por plato y el total con formato de precio', async () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
    });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1), product(2)]);
    renderPopover();

    expect(await screen.findByText('Plato 1')).toBeInTheDocument();
    expect(screen.getByText('Plato 2')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('S/ 34.00')).toBeInTheDocument();
  });

  it('el total se actualiza al cambiar la cantidad', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    renderPopover();

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar una unidad de Plato 1' }));

    expect(screen.getByText('S/ 22.00')).toBeInTheDocument();
  });

  it('un plato agotado no suma al total', async () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
    });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1), product(2, { available: false, stock: 0 })]);
    renderPopover();

    expect(await screen.findByText('Agotado, no suma al total')).toBeInTheDocument();
    expect(screen.getByText('S/ 22.00')).toBeInTheDocument();
  });

  it('"Vaciar carrito" lo deja vacío sin confirmación y avisa', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    renderPopover();

    await userEvent.click(await screen.findByRole('button', { name: 'Vaciar carrito' }));

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().lastCleared).not.toBeNull();
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
  });

  it('"Ver carrito" es un enlace a /cart', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    renderPopover();

    expect(await screen.findByRole('link', { name: 'Ver carrito' })).toHaveAttribute('href', '/cart');
  });

  it('con el carrito vacío no hay total ni botones', () => {
    renderPopover();

    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vaciar carrito' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver carrito' })).not.toBeInTheDocument();
    expect(cartApi.getProductsByIds).not.toHaveBeenCalled();
  });

  it('quitar el último plato pasa al estado vacío', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    renderPopover();

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Plato 1 del carrito' }));

    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
  });

  it('la lista se desplaza y el total queda fuera de ella', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    renderPopover();

    const list = await screen.findByRole('list');
    expect(list).toHaveClass('max-h-80', 'overflow-y-auto');
    expect(list).not.toContainElement(screen.getByText('Total'));
  });

  it('mientras carga muestra esqueletos y no el total', () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockReturnValue(new Promise(() => {}));
    renderPopover();

    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/^S\/ /)).not.toBeInTheDocument();
  });

  it('con error muestra el mensaje y permite reintentar', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockRejectedValue(new Error('500'));
    renderPopover();

    expect(await screen.findByText('No pudimos cargar tu carrito.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vaciar carrito' })).toBeInTheDocument();
  });
});
