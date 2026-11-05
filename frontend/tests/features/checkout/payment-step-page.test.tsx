import { render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { NOTIFICATION_DURATION_MS } from '@/components/notification';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import * as cartApi from '@/features/carrito/cart-api';
import { useCartStore } from '@/features/carrito/cart-store';
import type { Product } from '@/features/catalogo/catalog-api';
import * as checkoutApi from '@/features/checkout/checkout-api';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { PaymentStepPage } from '@/features/checkout/payment-step-page';
import * as redirect from '@/features/checkout/redirect-to-checkout';
import * as addressApi from '@/features/perfil/address-api';

vi.mock('@/features/auth/auth-api');
vi.mock('@/features/carrito/cart-api');
vi.mock('@/features/checkout/checkout-api');
vi.mock('@/features/checkout/redirect-to-checkout');
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
      { path: '/checkout/resultado', element: <p>resultado</p> },
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

  describe('pago en línea', () => {
    const created = { orderId: 42, checkoutUrl: 'https://pay.example.com/checkout?pref=42' };

    async function chooseOnline(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole('radio', { name: 'Pago en línea' }));
    }

    it('con Pago en línea el botón dice "Pagar" con el total y queda habilitado', async () => {
      renderPage();
      await chooseOnline(userEvent.setup());

      expect(await screen.findByRole('button', { name: 'Pagar S/ 68.50' })).toBeEnabled();
    });

    it('sin método elegido no hay botón de pagar y "Continuar" sigue deshabilitado', async () => {
      renderPage();

      expect(await screen.findByRole('button', { name: 'Continuar' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /Pagar/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Detalle del pago contraentrega')).not.toBeInTheDocument();
    });

    it('mientras carga el delivery el botón de pagar está deshabilitado', async () => {
      vi.mocked(checkoutApi.getDeliveryCost).mockReturnValue(new Promise(() => {}));
      renderPage();
      await chooseOnline(userEvent.setup());

      expect(screen.getByRole('button', { name: 'Pagar' })).toBeDisabled();
    });

    it('al pagar crea el pedido con el carrito, la entrega y el método, y redirige a Mercado Pago', async () => {
      vi.mocked(checkoutApi.createOrder).mockResolvedValue(created);
      const user = userEvent.setup();
      renderPage();
      await chooseOnline(user);

      await user.click(await screen.findByRole('button', { name: 'Pagar S/ 68.50' }));

      await waitFor(() => expect(redirect.redirectToCheckout).toHaveBeenCalledWith(created.checkoutUrl));
      expect(checkoutApi.createOrder).toHaveBeenCalledWith({
        items: [{ productId: 1, quantity: 2 }],
        deliveryType: 'ENTREGA',
        addressId: 1,
        paymentMethod: 'ONLINE',
      });
    });

    it('con Recojo en tienda no envía dirección', async () => {
      useCheckoutStore.getState().setDeliveryType('pickup');
      vi.mocked(checkoutApi.createOrder).mockResolvedValue(created);
      const user = userEvent.setup();
      renderPage();
      await chooseOnline(user);

      await user.click(await screen.findByRole('button', { name: 'Pagar S/ 60.00' }));

      await waitFor(() => expect(checkoutApi.createOrder).toHaveBeenCalled());
      expect(checkoutApi.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryType: 'RECOJO', addressId: null }),
      );
    });

    it('mientras espera la respuesta el botón está deshabilitado y un segundo clic no crea otro pedido', async () => {
      let resolve: (value: typeof created) => void = () => {};
      vi.mocked(checkoutApi.createOrder).mockReturnValue(new Promise((r) => (resolve = r)));
      const user = userEvent.setup();
      renderPage();
      await chooseOnline(user);
      const button = await screen.findByRole('button', { name: 'Pagar S/ 68.50' });

      await user.click(button);
      await user.click(button);

      expect(button).toBeDisabled();
      expect(checkoutApi.createOrder).toHaveBeenCalledTimes(1);
      resolve(created);
      await waitFor(() => expect(redirect.redirectToCheckout).toHaveBeenCalledTimes(1));
    });

    it('un error del servidor con mensaje (stock) lo muestra y deja reintentar', async () => {
      const error = new AxiosError('conflict', '409', undefined, undefined, {
        status: 409,
        data: { message: '«Plato 1» solo tiene 1 disponible.' },
      } as AxiosResponse);
      vi.mocked(checkoutApi.createOrder).mockRejectedValueOnce(error).mockResolvedValueOnce(created);
      const user = userEvent.setup();
      renderPage();
      await chooseOnline(user);

      await user.click(await screen.findByRole('button', { name: 'Pagar S/ 68.50' }));

      expect(await screen.findByText('«Plato 1» solo tiene 1 disponible.')).toBeInTheDocument();
      expect(redirect.redirectToCheckout).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Pagar S/ 68.50' }));
      await waitFor(() => expect(redirect.redirectToCheckout).toHaveBeenCalledWith(created.checkoutUrl));
    });

    it('el aviso de error queda abajo a la derecha y se cierra solo como las demás notificaciones', async () => {
      vi.mocked(checkoutApi.createOrder).mockRejectedValue(new Error('boom'));
      const user = userEvent.setup();
      renderPage();
      await chooseOnline(user);
      await user.click(await screen.findByRole('button', { name: 'Pagar S/ 68.50' }));

      const alert = await screen.findByRole('alert');
      expect(alert.parentElement).toHaveClass('fixed', 'right-6', 'bottom-6');
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument(), {
        timeout: NOTIFICATION_DURATION_MS + 1500,
      });
    });

    it('un error genérico muestra un mensaje general', async () => {
      vi.mocked(checkoutApi.createOrder).mockRejectedValue(new Error('boom'));
      const user = userEvent.setup();
      renderPage();
      await chooseOnline(user);

      await user.click(await screen.findByRole('button', { name: 'Pagar S/ 68.50' }));

      expect(await screen.findByText('No pudimos iniciar el pago. Intenta de nuevo.')).toBeInTheDocument();
    });
  });
  describe('contraentrega', () => {
    const created = { orderId: 77, checkoutUrl: null };

    async function chooseCash(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole('radio', { name: 'Contraentrega' }));
    }

    it('al elegir Contraentrega se abre el formulario sin nada elegido y con el botón deshabilitado', async () => {
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);

      expect(screen.getByText('Detalle del pago contraentrega')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Efectivo' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Yape' })).not.toBeChecked();
      expect(await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' })).toBeDisabled();
    });

    it('con Pago en línea el formulario se oculta y al volver conserva lo escrito', async () => {
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Efectivo' }));
      await user.type(screen.getByLabelText(/¿Con cuánto pagarás\?/), '100');

      await user.click(screen.getByRole('radio', { name: 'Pago en línea' }));
      expect(screen.queryByText('Detalle del pago contraentrega')).not.toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'Contraentrega' }));

      expect(screen.getByRole('radio', { name: 'Efectivo' })).toBeChecked();
      expect(screen.getByLabelText(/¿Con cuánto pagarás\?/)).toHaveValue('100');
    });

    it('Yape habilita el botón y no pide monto', async () => {
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Yape' }));

      expect(screen.queryByLabelText(/¿Con cuánto pagarás\?/)).not.toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' })).toBeEnabled();
    });

    it('Efectivo muestra el campo opcional y con el campo vacío el botón está habilitado', async () => {
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Efectivo' }));

      expect(screen.getByLabelText(/¿Con cuánto pagarás\?/)).toBeInTheDocument();
      expect(screen.getByLabelText(/opcional/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' })).toBeEnabled();
    });

    it('un monto menor al total muestra el error y deshabilita; uno mayor muestra el vuelto', async () => {
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Efectivo' }));
      const field = screen.getByLabelText(/¿Con cuánto pagarás\?/);

      await user.type(field, '50');
      expect(await screen.findByText('El monto debe ser al menos S/ 68.50')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar pedido S/ 68.50' })).toBeDisabled();

      await user.clear(field);
      await user.type(field, '100');
      expect(screen.getByText('Vuelto: S/ 31.50')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar pedido S/ 68.50' })).toBeEnabled();
    });

    it('al confirmar con efectivo envía el monto y navega al resultado', async () => {
      vi.mocked(checkoutApi.createOrder).mockResolvedValue(created);
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Efectivo' }));
      await user.type(screen.getByLabelText(/¿Con cuánto pagarás\?/), '100');

      await user.click(await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' }));

      expect(await screen.findByText('resultado')).toBeInTheDocument();
      expect(checkoutApi.createOrder).toHaveBeenCalledWith({
        items: [{ productId: 1, quantity: 2 }],
        deliveryType: 'ENTREGA',
        addressId: 1,
        paymentMethod: 'CONTRAENTREGA',
        collection: { method: 'EFECTIVO', cashAmount: 100 },
      });
      expect(redirect.redirectToCheckout).not.toHaveBeenCalled();
    });

    it('con efectivo vacío envía monto nulo, y con Yape nunca envía el monto escrito antes', async () => {
      vi.mocked(checkoutApi.createOrder).mockResolvedValue(created);
      useCheckoutStore.getState().setDeliveryType('pickup');
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Efectivo' }));
      await user.type(screen.getByLabelText(/¿Con cuánto pagarás\?/), '100');
      await user.click(screen.getByRole('radio', { name: 'Yape' }));

      await user.click(await screen.findByRole('button', { name: 'Confirmar pedido S/ 60.00' }));

      await waitFor(() => expect(checkoutApi.createOrder).toHaveBeenCalled());
      expect(checkoutApi.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryType: 'RECOJO',
          addressId: null,
          collection: { method: 'YAPE', cashAmount: null },
        }),
      );
    });

    it('con Recojo los textos hablan de pagar al recoger', async () => {
      useCheckoutStore.getState().setDeliveryType('pickup');
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);

      expect(screen.getByText('Detalle del pago al recoger')).toBeInTheDocument();
    });

    it('mientras espera está deshabilitado y un segundo clic no crea otro pedido', async () => {
      let resolve: (value: typeof created) => void = () => {};
      vi.mocked(checkoutApi.createOrder).mockReturnValue(new Promise((r) => (resolve = r)));
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Yape' }));
      const button = await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' });

      await user.click(button);
      await user.click(button);

      expect(button).toBeDisabled();
      expect(checkoutApi.createOrder).toHaveBeenCalledTimes(1);
      resolve(created);
      expect(await screen.findByText('resultado')).toBeInTheDocument();
    });

    it('un error del servidor muestra su mensaje y deja corregir y reintentar', async () => {
      const error = new AxiosError('conflict', '409', undefined, undefined, {
        status: 409,
        data: { message: '«Plato 1» solo tiene 1 disponible.' },
      } as AxiosResponse);
      vi.mocked(checkoutApi.createOrder).mockRejectedValueOnce(error).mockResolvedValueOnce(created);
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Yape' }));

      await user.click(await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' }));

      expect(await screen.findByText('«Plato 1» solo tiene 1 disponible.')).toBeInTheDocument();
      expect(screen.getByText('No pudimos confirmar el pedido')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Confirmar pedido S/ 68.50' }));
      expect(await screen.findByText('resultado')).toBeInTheDocument();
    });

    it('un error genérico muestra el mensaje general de confirmación', async () => {
      vi.mocked(checkoutApi.createOrder).mockRejectedValue(new Error('boom'));
      const user = userEvent.setup();
      renderPage();
      await chooseCash(user);
      await user.click(screen.getByRole('radio', { name: 'Yape' }));

      await user.click(await screen.findByRole('button', { name: 'Confirmar pedido S/ 68.50' }));

      expect(await screen.findByText('No pudimos confirmar el pedido. Intenta de nuevo.')).toBeInTheDocument();
    });
  });
});
