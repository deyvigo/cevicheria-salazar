import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import * as cartApi from '@/features/carrito/cart-api';
import { useCartStore } from '@/features/carrito/cart-store';
import type { Product } from '@/features/catalogo/catalog-api';
import * as checkoutApi from '@/features/checkout/checkout-api';
import { DeliveryStepPage } from '@/features/checkout/delivery-step-page';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import * as addressApi from '@/features/perfil/address-api';

vi.mock('@/features/auth/auth-api');
vi.mock('@/features/carrito/cart-api');
vi.mock('@/features/checkout/checkout-api');
vi.mock('@/features/perfil/address-api');
vi.mock('@/features/perfil/components/location-picker', () => ({ LocationPicker: () => <div>mapa</div> }));

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
  hasPassword: true,
};

const plato: Product = {
  id: 1,
  name: 'Plato 1',
  description: '',
  price: 30,
  rating: null,
  imageUrl: null,
  available: true,
  stock: 10,
};

const casa = { id: 1, label: 'Casa', address: 'Av. Arequipa 123', reference: null, latitude: -12.05, longitude: -77.03 };
const trabajo = { ...casa, id: 2, label: 'Trabajo', address: 'Jr. Unión 1' };

const summaryValue = (label: string) => {
  const region = screen.getByRole('region', { name: 'Resumen del pedido' });
  return within(region).getByText(label).nextElementSibling?.textContent;
};

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/checkout/direcciones', element: <DeliveryStepPage /> },
      { path: '/cart', element: <p>carrito</p> },
    ],
    { initialEntries: ['/checkout/direcciones'] },
  );
  render(
    <QueryWrapper>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryWrapper>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(authApi.me).mockResolvedValue(maria);
  vi.mocked(cartApi.getProductsByIds).mockResolvedValue([plato]);
  vi.mocked(addressApi.listAddresses).mockResolvedValue([casa, trabajo]);
  vi.mocked(checkoutApi.getDeliveryCost).mockImplementation(async (id) =>
    id === 1 ? { covered: true, price: 8.5, zone: 'Centro' } : { covered: false, price: 0, zone: null },
  );
  useCartStore.setState({ items: [{ productId: 1, quantity: 2 }] });
  useCheckoutStore.getState().reset();
  useCheckoutStore.getState().enter();
});

describe('DeliveryStepPage', () => {
  it('muestra el paso Entrega resaltado y Entrega preseleccionada con sus direcciones', async () => {
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
    await waitFor(() => expect(within(nav).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step'));
    expect(within(nav).getAllByRole('listitem')[1]).toHaveTextContent('Entrega');
    expect(screen.getByRole('radio', { name: 'Entrega' })).toBeChecked();
    expect(await screen.findAllByRole('radio', { name: /Casa|Trabajo/ })).toHaveLength(2);
  });

  it('si la compra empezó sin sesión conserva los cinco pasos con Entrega como tercero', async () => {
    useCheckoutStore.getState().enter(true);
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
    await waitFor(() => expect(within(nav).getAllByRole('listitem')).toHaveLength(5));
    expect(within(nav).getByText('Inicio de sesión')).toBeInTheDocument();
    expect(within(nav).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
    expect(within(nav).getAllByRole('listitem')[2]).toHaveTextContent('Entrega');
  });

  it('al elegir una dirección con zona muestra su tarifa y suma al total', async () => {
    renderPage();
    await userEvent.setup().click(await screen.findByRole('radio', { name: /Casa/ }));

    await waitFor(() => expect(summaryValue('Delivery')).toBe('S/ 8.50'));
    expect(summaryValue('Total')).toBe('S/ 68.50');
    expect(checkoutApi.getDeliveryCost).toHaveBeenCalledWith(1);
  });

  it('una dirección fuera de cobertura avisa y muestra S/ 0.00', async () => {
    renderPage();
    await userEvent.setup().click(await screen.findByRole('radio', { name: /Trabajo/ }));

    expect(await screen.findByText('Tu dirección no está en cobertura')).toBeInTheDocument();
    expect(summaryValue('Delivery')).toBe('S/ 0.00');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('al cambiar de dirección no muestra el delivery anterior mientras carga', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('radio', { name: /Casa/ }));
    await waitFor(() => expect(summaryValue('Delivery')).toBe('S/ 8.50'));

    vi.mocked(checkoutApi.getDeliveryCost).mockReturnValue(new Promise(() => {}));
    await user.click(screen.getByRole('radio', { name: /Trabajo/ }));

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).queryByText('S/ 8.50')).not.toBeInTheDocument();
    expect(within(region).queryByText('Total')).not.toBeInTheDocument();
  });

  it('si falla el cálculo ofrece reintentar', async () => {
    vi.mocked(checkoutApi.getDeliveryCost).mockRejectedValueOnce(new Error('x')).mockResolvedValue({
      covered: true,
      price: 8.5,
      zone: 'Centro',
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('radio', { name: /Casa/ }));

    expect(await screen.findByText('No pudimos calcular el costo de delivery.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(summaryValue('Delivery')).toBe('S/ 8.50'));
  });

  it('Recojo en tienda oculta las direcciones, deja el delivery en S/ 0.00 y sin aviso', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('radio', { name: /Trabajo/ }));
    await screen.findByText('Tu dirección no está en cobertura');

    await user.click(screen.getByRole('radio', { name: 'Recojo en tienda' }));

    expect(screen.queryByRole('radio', { name: /Casa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar nueva dirección' })).not.toBeInTheDocument();
    expect(screen.queryByText('Tu dirección no está en cobertura')).not.toBeInTheDocument();
    expect(summaryValue('Delivery')).toBe('S/ 0.00');
    expect(summaryValue('Total')).toBe('S/ 60.00');
  });

  it('al volver a Entrega conserva la dirección elegida', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('radio', { name: /Casa/ }));
    await waitFor(() => expect(summaryValue('Delivery')).toBe('S/ 8.50'));

    await user.click(screen.getByRole('radio', { name: 'Recojo en tienda' }));
    await user.click(screen.getByRole('radio', { name: 'Entrega' }));

    expect(await screen.findByRole('radio', { name: /Casa/ })).toBeChecked();
    await waitFor(() => expect(summaryValue('Delivery')).toBe('S/ 8.50'));
  });

  it('agregar una dirección la selecciona y calcula su costo; cancelar no cambia nada', async () => {
    const nueva = { ...casa, id: 3, label: 'Oficina', address: 'Calle Nueva 5' };
    vi.mocked(addressApi.createAddress).mockImplementation(async () => {
      vi.mocked(addressApi.listAddresses).mockResolvedValue([nueva, casa, trabajo]);
      return nueva;
    });
    vi.mocked(checkoutApi.getDeliveryCost).mockResolvedValue({ covered: true, price: 6, zone: 'Norte' });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('radio', { name: /Casa/ }));

    await user.click(screen.getByRole('button', { name: 'Agregar nueva dirección' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('radio', { name: /Casa/ })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Agregar nueva dirección' }));
    const open = await screen.findByRole('dialog');
    await user.type(within(open).getByLabelText(/Nombre/), 'Oficina');
    await user.type(within(open).getByLabelText(/^Dirección/), 'Calle Nueva 5');
    await user.click(within(open).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('radio', { name: /Oficina/ })).toBeChecked();
    await waitFor(() => expect(checkoutApi.getDeliveryCost).toHaveBeenCalledWith(3));
    await waitFor(() => expect(summaryValue('Delivery')).toBe('S/ 6.00'));
  });

  it('si la dirección elegida desaparece de la lista, se limpia la selección', async () => {
    useCheckoutStore.getState().selectAddress(99);
    renderPage();

    await screen.findAllByRole('radio', { name: /Casa|Trabajo/ });
    await waitFor(() => expect(useCheckoutStore.getState().selectedAddressId).toBeNull());
  });

  it('"Continuar" está deshabilitado y "Volver al carrito" lleva a /cart', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeDisabled();
    await user.click(screen.getByRole('link', { name: 'Volver al carrito' }));

    expect(await screen.findByText('carrito')).toBeInTheDocument();
  });
});
