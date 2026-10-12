import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as cartApi from '@/features/carrito/cart-api';
import { CartPage } from '@/features/carrito/cart-page';
import { useCartStore } from '@/features/carrito/cart-store';
import { encodeCart } from '@/features/carrito/share-code';
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

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderCart(entry = '/cart') {
  const router = createMemoryRouter(
    [
      {
        path: '/cart',
        element: (
          <>
            <CartPage />
            <Location />
          </>
        ),
      },
    ],
    { initialEntries: [entry] },
  );
  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>,
  );
}

beforeEach(() => {
  vi.mocked(cartApi.getProductsByIds).mockReset();
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null });
});

describe('CartPage', () => {
  it('muestra el carrito vacío con el enlace a la carta y sin "Compartir"', () => {
    renderCart();

    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la carta' })).toHaveAttribute('href', '/menu');
    expect(screen.queryByRole('button', { name: 'Compartir' })).not.toBeInTheDocument();
    expect(cartApi.getProductsByIds).not.toHaveBeenCalled();
  });

  it('lista imagen, nombre, precio y cantidad de cada plato', async () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
    });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1), product(2)]);
    renderCart();

    expect(await screen.findByRole('link', { name: 'Plato 1' })).toHaveAttribute('href', '/products/1');
    expect(screen.getByText('S/ 11.00')).toBeInTheDocument();
    expect(screen.getByText('S/ 12.00')).toBeInTheDocument();
    expect(screen.getAllByText(/Cantidad:/)).toHaveLength(2);
    expect(cartApi.getProductsByIds).toHaveBeenCalledWith([1, 2]);
  });

  it('las filas enlazan al detalle recordando que vienen del carrito y no asignan nombres de transición', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 2 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    const { container } = renderCart();

    const link = await screen.findByRole('link', { name: 'Plato 1' });

    expect(link).toHaveAttribute('href', '/products/1');
    expect(container.querySelector('[style*="view-transition-name"]')).toBeNull();
  });

  it('marca un plato agotado con el aviso y lo conserva en el carrito', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 2 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1, { available: false, stock: 0 })]);
    renderCart();

    expect(await screen.findByText('Agotado')).toBeInTheDocument();
    expect(screen.getByText('Este plato está agotado. Quítalo o elige otro de la carta.')).toBeInTheDocument();
    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 2 }]);
  });

  it('ajusta la cantidad al stock y quita los platos que el servidor ya no devuelve', async () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 50 },
        { productId: 2, quantity: 1 },
      ],
    });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1, { stock: 4 })]);
    renderCart();

    await waitFor(() => expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 4 }]));
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.queryByText('Plato 2')).not.toBeInTheDocument();
  });

  it('con error de red muestra "Reintentar" y no toca el carrito', async () => {
    useCartStore.setState({ items: [{ productId: 1, quantity: 2 }] });
    vi.mocked(cartApi.getProductsByIds).mockRejectedValueOnce(new Error('network'));
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    const user = userEvent.setup();
    renderCart();

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: 'Plato 1' })).toBeInTheDocument();
    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 2 }]);
  });

  it('importa el carrito de ?c=, limpia la URL y no vuelve a importar al recargar', async () => {
    const code = encodeCart([
      { productId: 1, quantity: 3 },
      { productId: 2, quantity: 1 },
    ]);
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1), product(2)]);
    renderCart(`/cart?c=${code}`);

    expect(await screen.findByText('Cargamos el carrito que te compartieron')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Plato 1' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/cart$/);
    expect(useCartStore.getState().items).toEqual([
      { productId: 1, quantity: 3 },
      { productId: 2, quantity: 1 },
    ]);
  });

  it('el plato presente en ambos toma la cantidad del enlace y los locales se conservan', async () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 7 },
        { productId: 5, quantity: 2 },
      ],
    });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1), product(5)]);
    renderCart(`/cart?c=${encodeCart([{ productId: 1, quantity: 2 }])}`);

    await waitFor(() =>
      expect(useCartStore.getState().items).toEqual([
        { productId: 1, quantity: 2 },
        { productId: 5, quantity: 2 },
      ]),
    );
  });

  it('con un código inválido avisa, limpia la URL y no cambia el carrito', async () => {
    useCartStore.setState({ items: [{ productId: 9, quantity: 1 }] });
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(9)]);
    renderCart('/cart?c=%%%');

    expect(await screen.findByText('No pudimos leer el carrito compartido')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/cart$/);
    expect(useCartStore.getState().items).toEqual([{ productId: 9, quantity: 1 }]);
  });
});
