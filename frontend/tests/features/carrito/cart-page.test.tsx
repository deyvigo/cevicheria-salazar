import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import * as cartApi from '@/features/carrito/cart-api';
import { CartPage } from '@/features/carrito/cart-page';
import { useCartStore } from '@/features/carrito/cart-store';
import { encodeCart } from '@/features/carrito/share-code';
import type { Product } from '@/features/catalogo/catalog-api';

vi.mock('@/features/carrito/cart-api');
vi.mock('@/features/auth/auth-api');

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
  hasPassword: true,
};

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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryWrapper>,
  );
}

beforeEach(() => {
  vi.mocked(cartApi.getProductsByIds).mockReset();
  vi.mocked(authApi.me).mockReset().mockResolvedValue(null as unknown as AuthUser);
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null, lastRemoved: null });
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
    expect(screen.getByRole('textbox', { name: 'Cantidad de Plato 1' })).toHaveValue('2');
    expect(screen.getByRole('textbox', { name: 'Cantidad de Plato 2' })).toHaveValue('1');
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
    expect(await screen.findByRole('textbox', { name: 'Cantidad de Plato 1' })).toHaveValue('4');
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

  describe('editar cantidades', () => {
    beforeEach(() => {
      useCartStore.setState({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
      });
      vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1, { stock: 3 }), product(2)]);
    });

    it('+ y − cambian la cantidad sin avisar y + se deshabilita en el stock', async () => {
      const user = userEvent.setup();
      renderCart();
      const field = await screen.findByRole('textbox', {
        name: 'Cantidad de Plato 1',
      });

      await user.click(screen.getByRole('button', { name: 'Agregar una unidad de Plato 1' }));
      expect(field).toHaveValue('3');
      expect(screen.getByRole('button', { name: 'Agregar una unidad de Plato 1' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Quitar una unidad de Plato 1' }));
      expect(field).toHaveValue('2');
      expect(useCartStore.getState().items[0]).toEqual({
        productId: 1,
        quantity: 2,
      });
      expect(useCartStore.getState().lastRemoved).toBeNull();
    });

    it('aplica la cantidad escrita y la recorta al stock', async () => {
      const user = userEvent.setup();
      renderCart();
      const field = await screen.findByRole('textbox', {
        name: 'Cantidad de Plato 1',
      });

      await user.clear(field);
      await user.type(field, '50{Enter}');

      expect(useCartStore.getState().items[0]).toEqual({
        productId: 1,
        quantity: 3,
      });
      expect(field).toHaveValue('3');
    });

    it('la fila se desvanece antes de quitarse del carrito', async () => {
      const user = userEvent.setup();
      renderCart();

      await user.click(await screen.findByRole('button', { name: 'Eliminar Plato 1 del carrito' }));

      expect(screen.getByRole('link', { name: 'Plato 1' }).closest('li')).toHaveClass('opacity-0');
      expect(useCartStore.getState().items).toHaveLength(2);
      await waitFor(() => expect(useCartStore.getState().items).toHaveLength(1));
    });

    it('"Eliminar" quita la fila de inmediato y deja el foco en el título', async () => {
      const user = userEvent.setup();
      renderCart();

      await user.click(
        await screen.findByRole('button', {
          name: 'Eliminar Plato 1 del carrito',
        }),
      );

      await waitFor(() => expect(useCartStore.getState().items).toEqual([{ productId: 2, quantity: 1 }]));
      expect(screen.queryByRole('link', { name: 'Plato 1' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Tu carrito' })).toHaveFocus();
    });

    it('− desde 1 y escribir 0 quitan el plato', async () => {
      const user = userEvent.setup();
      renderCart();

      await user.click(
        await screen.findByRole('button', {
          name: 'Quitar una unidad de Plato 2',
        }),
      );
      await waitFor(() => expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 2 }]));

      const field = screen.getByRole('textbox', {
        name: 'Cantidad de Plato 1',
      });
      await user.clear(field);
      await user.type(field, '0{Enter}');
      await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
      expect(await screen.findByText('Tu carrito está vacío.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Compartir' })).not.toBeInTheDocument();
    });

    it('un plato agotado tiene + deshabilitado y se puede quitar', async () => {
      vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1, { available: false, stock: 0 }), product(2)]);
      const user = userEvent.setup();
      renderCart();

      expect(
        await screen.findByRole('button', {
          name: 'Agregar una unidad de Plato 1',
        }),
      ).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Quitar una unidad de Plato 1' }));
      expect(useCartStore.getState().items[0]).toEqual({
        productId: 1,
        quantity: 1,
      });

      await user.click(screen.getByRole('button', { name: 'Eliminar Plato 1 del carrito' }));
      await waitFor(() => expect(useCartStore.getState().items).toEqual([{ productId: 2, quantity: 1 }]));
    });

    it('no ofrece el control hasta conocer el stock', () => {
      vi.mocked(cartApi.getProductsByIds).mockReturnValue(new Promise(() => {}));
      renderCart();

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('el enlace de compartir lleva las cantidades vigentes', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
      renderCart();

      await user.click(
        await screen.findByRole('button', {
          name: 'Agregar una unidad de Plato 1',
        }),
      );
      await user.click(screen.getByRole('button', { name: 'Compartir' }));

      const link = writeText.mock.calls[0][0] as string;
      expect(link).toContain(
        encodeCart([
          { productId: 1, quantity: 3 },
          { productId: 2, quantity: 1 },
        ]),
      );
    });
  });

  describe('resumen del pedido', () => {
    const summaryValue = (label: string) => {
      const region = screen.getByRole('region', { name: 'Resumen del pedido' });
      const term = within(region).getByText(label);
      return term.nextElementSibling?.textContent;
    };

    beforeEach(() => {
      useCartStore.setState({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
      });
      vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1, { price: 32 }), product(2, { price: 18.5 })]);
    });

    it('muestra subtotal, descuento, delivery y total', async () => {
      renderCart();

      await screen.findByRole('textbox', { name: 'Cantidad de Plato 1' });
      expect(summaryValue('Subtotal')).toBe('S/ 82.50');
      expect(summaryValue('Descuento')).toBe('S/ 0.00');
      expect(summaryValue('Delivery')).toBe('S/ 5.00');
      expect(summaryValue('Total')).toBe('S/ 87.50');
    });

    it('no muestra montos mientras cargan los precios', async () => {
      vi.mocked(cartApi.getProductsByIds).mockReturnValue(new Promise(() => {}));
      renderCart();

      const region = screen.getByRole('region', { name: 'Resumen del pedido' });
      expect(region).toHaveAttribute('aria-busy', 'true');
      expect(within(region).queryByText(/S\//)).not.toBeInTheDocument();
    });

    it('se recalcula al cambiar la cantidad y al eliminar un plato', async () => {
      const user = userEvent.setup();
      renderCart();
      await screen.findByRole('textbox', { name: 'Cantidad de Plato 1' });

      await user.click(screen.getByRole('button', { name: 'Agregar una unidad de Plato 1' }));
      expect(summaryValue('Subtotal')).toBe('S/ 114.50');
      expect(summaryValue('Total')).toBe('S/ 119.50');

      await user.click(screen.getByRole('button', { name: 'Eliminar Plato 1 del carrito' }));
      await waitFor(() => expect(summaryValue('Subtotal')).toBe('S/ 18.50'));
      expect(summaryValue('Total')).toBe('S/ 23.50');
    });

    it('no suma los platos agotados', async () => {
      vi.mocked(cartApi.getProductsByIds).mockResolvedValue([
        product(1, { price: 32 }),
        product(2, { price: 18.5, available: false, stock: 0 }),
      ]);
      renderCart();

      await screen.findByText('Agotado');
      expect(summaryValue('Subtotal')).toBe('S/ 64.00');
    });

    it('desaparece con el carrito vacío y con error', async () => {
      useCartStore.setState({ items: [] });
      const { unmount } = renderCart();
      expect(screen.queryByRole('region', { name: 'Resumen del pedido' })).not.toBeInTheDocument();
      unmount();

      useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
      vi.mocked(cartApi.getProductsByIds).mockRejectedValue(new Error('network'));
      renderCart();
      await screen.findByRole('button', { name: 'Reintentar' });
      expect(screen.queryByRole('region', { name: 'Resumen del pedido' })).not.toBeInTheDocument();
    });
  });

  describe('pasos de la compra', () => {
    const stepper = () => screen.queryByRole('navigation', { name: 'Pasos de la compra' });

    beforeEach(() => {
      useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
      vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(1)]);
    });

    it('como visitante muestra cinco pasos con "Carrito de compras" como actual', async () => {
      renderCart();

      const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
      const items = within(nav).getAllByRole('listitem');
      expect(items).toHaveLength(5);
      expect(within(nav).getByText('Inicio de sesión')).toBeInTheDocument();
      expect(items[0]).toHaveAttribute('aria-current', 'step');
      expect(items.filter((li) => li.hasAttribute('aria-current'))).toHaveLength(1);
    });

    it('con sesión iniciada muestra cuatro pasos, sin "Inicio de sesión"', async () => {
      vi.mocked(authApi.me).mockResolvedValue(maria);
      renderCart();

      const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
      expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
      expect(within(nav).queryByText('Inicio de sesión')).not.toBeInTheDocument();
    });

    it('no se muestra mientras se verifica la sesión', async () => {
      vi.mocked(authApi.me).mockReturnValue(new Promise(() => {}));
      renderCart();

      await screen.findByRole('link', { name: 'Plato 1' });
      expect(stepper()).not.toBeInTheDocument();
    });

    it('no aparece con el carrito vacío ni con error de carga', async () => {
      useCartStore.setState({ items: [] });
      const { unmount } = renderCart();
      await screen.findByText('Tu carrito está vacío.');
      expect(stepper()).not.toBeInTheDocument();
      unmount();

      useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
      vi.mocked(cartApi.getProductsByIds).mockRejectedValue(new Error('network'));
      renderCart();
      await screen.findByRole('button', { name: 'Reintentar' });
      expect(stepper()).not.toBeInTheDocument();
    });

    it('desaparece al quitar el último plato', async () => {
      const user = userEvent.setup();
      renderCart();
      await screen.findByRole('navigation', { name: 'Pasos de la compra' });

      await user.click(screen.getByRole('button', { name: /Eliminar/ }));

      expect(await screen.findByText('Tu carrito está vacío.')).toBeInTheDocument();
      expect(stepper()).not.toBeInTheDocument();
    });

    it('al importar un carrito compartido se muestra en el primer paso', async () => {
      useCartStore.setState({ items: [] });
      vi.mocked(cartApi.getProductsByIds).mockResolvedValue([product(2)]);
      renderCart(`/cart?c=${encodeCart([{ productId: 2, quantity: 1 }])}`);

      const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
      expect(within(nav).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    });

    it('hacer clic en un paso no cambia el paso actual', async () => {
      const user = userEvent.setup();
      renderCart();
      const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });

      await user.click(within(nav).getByText('Pago'));

      expect(within(nav).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
      expect(screen.getByTestId('location')).toHaveTextContent('/cart');
    });
  });
});
