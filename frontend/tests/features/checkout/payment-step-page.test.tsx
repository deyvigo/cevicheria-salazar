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
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { PaymentStepPage } from '@/features/checkout/payment-step-page';
import * as addressApi from '@/features/perfil/address-api';

vi.mock('@/features/auth/auth-api');
vi.mock('@/features/carrito/cart-api');
vi.mock('@/features/checkout/checkout-api');
vi.mock('@/features/perfil/address-api');

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

const summaryValue = (label: string) => {
  const region = screen.getByRole('region', { name: 'Resumen del pedido' });
  return within(region).getByText(label).nextElementSibling?.textContent;
};

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/checkout/pago', element: <PaymentStepPage /> },
      { path: '/checkout/direcciones', element: <p>entrega</p> },
    ],
    { initialEntries: ['/checkout/pago'] },
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
  vi.mocked(addressApi.listAddresses).mockResolvedValue([casa]);
  vi.mocked(checkoutApi.getDeliveryCost).mockResolvedValue({ covered: true, price: 8.5, zone: 'Centro' });
  useCartStore.setState({ items: [{ productId: 1, quantity: 2 }] });
  useCheckoutStore.getState().reset();
  useCheckoutStore.getState().enter();
  useCheckoutStore.getState().selectAddress(1);
});

describe('PaymentStepPage', () => {
  it('resalta Pago como tercer paso con sesión y muestra las opciones sin marcar', async () => {
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
    await waitFor(() => expect(within(nav).getAllByRole('listitem')).toHaveLength(4));
    expect(within(nav).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
    expect(within(nav).getAllByRole('listitem')[2]).toHaveTextContent('Pago');
    expect(screen.getByRole('radio', { name: 'Pago en línea' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Contraentrega' })).not.toBeChecked();
  });

  it('si la compra empezó sin sesión Pago es el cuarto de cinco pasos', async () => {
    useCheckoutStore.getState().enter(true);
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Pasos de la compra' });
    await waitFor(() => expect(within(nav).getAllByRole('listitem')).toHaveLength(5));
    expect(within(nav).getAllByRole('listitem')[3]).toHaveAttribute('aria-current', 'step');
  });

  it('elegir un método lo guarda y se puede cambiar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('radio', { name: 'Pago en línea' }));
    expect(useCheckoutStore.getState().paymentMethod).toBe('online');
    await user.click(screen.getByRole('radio', { name: 'Contraentrega' }));

    expect(useCheckoutStore.getState().paymentMethod).toBe('cash_on_delivery');
    expect(screen.getByRole('radio', { name: 'Pago en línea' })).not.toBeChecked();
  });

  it('con Entrega muestra la tarifa vigente, el total la incluye y no muestra la dirección', async () => {
    renderPage();

    await waitFor(() => expect(summaryValue('Entrega')).toBe('S/ 8.50'));
    expect(summaryValue('Total')).toBe('S/ 68.50');
    expect(screen.queryByText('Av. Arequipa 123')).not.toBeInTheDocument();
    expect(screen.getByText('Paga al recibir tu pedido')).toBeInTheDocument();
  });

  it('con Recojo en tienda el delivery es S/ 0.00 y no consulta el costo', async () => {
    useCheckoutStore.getState().setDeliveryType('pickup');
    renderPage();

    await waitFor(() => expect(summaryValue('Total')).toBe('S/ 60.00'));
    expect(summaryValue('Entrega')).toBe('S/ 0.00');
    expect(screen.getByText('Paga al recoger tu pedido en tienda')).toBeInTheDocument();
    expect(checkoutApi.getDeliveryCost).not.toHaveBeenCalled();
  });

  it('si falla el cálculo del delivery ofrece reintentar', async () => {
    vi.mocked(checkoutApi.getDeliveryCost).mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('"Continuar" está deshabilitado y "Volver" lleva a Entrega conservando la selección', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeDisabled();
    await user.click(screen.getByRole('link', { name: 'Volver' }));

    expect(await screen.findByText('entrega')).toBeInTheDocument();
    expect(useCheckoutStore.getState()).toMatchObject({ deliveryType: 'delivery', selectedAddressId: 1 });
  });
});
