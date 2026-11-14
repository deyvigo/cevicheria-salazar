import { act, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import { useCartStore } from '@/features/carrito/cart-store';
import * as checkoutApi from '@/features/checkout/checkout-api';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { ORDER_WAIT_LIMIT_MS, OrderResultPage } from '@/features/checkout/order-result-page';
import { ORDER_POLL_MS } from '@/features/checkout/use-order';

vi.mock('@/features/checkout/checkout-api');
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

const paid: checkoutApi.Order = {
  id: 42,
  code: 'SAL-001042',
  status: 'PAGADO',
  deliveryType: 'ENTREGA',
  paymentMethod: 'ONLINE',
  subtotal: 60,
  deliveryPrice: 8.5,
  total: 68.5,
  items: [{ productId: 1, name: 'Ceviche clásico', unitPrice: 30, quantity: 2, lineTotal: 60 }],
  paymentStatus: 'approved',
  deliveryCode: '4827',
  collectionMethod: null,
  cashAmount: null,
  change: null,
  customerName: 'María Quispe',
  deliveryStatus: 'EN_PREPARACION',
  address: { label: 'Casa', text: 'Av. Arequipa 123, Lince', reference: 'Puerta verde' },
  purchasedAt: '2026-11-07T19:30:00Z',
  paidAt: '2026-11-07T19:35:00Z',
};
const pending: checkoutApi.Order = { ...paid, status: 'PENDIENTE_PAGO', paymentStatus: null, deliveryCode: null };

const cashOrder: checkoutApi.Order = {
  ...paid,
  status: 'PENDIENTE_COBRO',
  paymentMethod: 'CONTRAENTREGA',
  paymentStatus: null,
  collectionMethod: 'EFECTIVO',
  cashAmount: 100,
  change: 31.5,
};

function renderPage(url = '/checkout/resultado?pedido=42') {
  const router = createMemoryRouter(
    [
      { path: '/checkout/resultado', element: <OrderResultPage /> },
      { path: '/cart', element: <p>carrito</p> },
      { path: '/menu', element: <p>carta</p> },
      { path: '/perfil/mis-pedidos', element: <p>mis pedidos</p> },
    ],
    { initialEntries: [url] },
  );
  render(
    <QueryWrapper>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryWrapper>,
  );
}

function notFound() {
  return new AxiosError('nf', '404', undefined, undefined, { status: 404 } as AxiosResponse);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.me).mockResolvedValue(maria);
  localStorage.clear();
  useCartStore.setState({ items: [{ productId: 1, quantity: 2 }] });
  useCheckoutStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OrderResultPage', () => {
  describe('contraentrega', () => {
    it('muestra "Recibimos tu pedido" con ambos códigos, el monto y el vuelto, y vacía el carrito', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue(cashOrder);
      renderPage();

      expect(await screen.findByText('Recibimos tu pedido')).toBeInTheDocument();
      expect(screen.getByText('SAL-001042')).toBeInTheDocument();
      expect(screen.getByText('4827')).toBeInTheDocument();
      expect(screen.getByText('Pagarás con S/ 100.00 en efectivo (vuelto S/ 31.50).')).toBeInTheDocument();
      expect(screen.queryByText('Estamos confirmando tu pago')).not.toBeInTheDocument();
      await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    });

    it('efectivo sin monto solo dice que pagará en efectivo', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue({ ...cashOrder, cashAmount: null, change: null });
      renderPage();

      expect(await screen.findByText('Pagarás en efectivo al recibir tu pedido.')).toBeInTheDocument();
    });

    it('Yape lo indica, y con Recojo habla de recoger', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue({
        ...cashOrder,
        deliveryType: 'RECOJO',
        collectionMethod: 'YAPE',
        cashAmount: null,
        change: null,
      });
      renderPage();

      expect(await screen.findByText('Pagarás con Yape al recoger tu pedido.')).toBeInTheDocument();
    });

    it('no vuelve a consultar el pedido', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(checkoutApi.getOrder).mockResolvedValue(cashOrder);
      renderPage();
      await screen.findByText('Recibimos tu pedido');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(ORDER_POLL_MS * 3);
      });

      expect(checkoutApi.getOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('con el pedido pagado muestra ambos códigos, el indicador en ¡Listo! y vacía el carrito', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue(paid);
    renderPage();

    expect(await screen.findByText('Recibimos tu pago')).toBeInTheDocument();
    expect(screen.getByText('SAL-001042')).toBeInTheDocument();
    expect(screen.getByText('4827')).toBeInTheDocument();
    expect(checkoutApi.getOrder).toHaveBeenCalledWith(42);
    const nav = screen.getByRole('navigation', { name: 'Pasos de la compra' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
    expect(within(nav).getAllByRole('listitem')[3]).toHaveAttribute('aria-current', 'step');
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
  });

  describe('confirmación completa', () => {
    it('muestra nombre, estados, dirección, pago, detalle de platos, importes y ambas fechas', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue(paid);
      renderPage();

      expect(await screen.findByText('Recibimos tu pago')).toBeInTheDocument();
      expect(screen.getByText('María Quispe')).toBeInTheDocument();
      expect(screen.getByText('Pagado')).toBeInTheDocument();
      expect(screen.getByText('En preparación')).toBeInTheDocument();
      expect(screen.getByText('Entrega a domicilio')).toBeInTheDocument();
      expect(screen.getByText('Casa: Av. Arequipa 123, Lince')).toBeInTheDocument();
      expect(screen.getByText('Referencia: Puerta verde')).toBeInTheDocument();
      expect(screen.getByText('Pago en línea')).toBeInTheDocument();
      expect(screen.getByText('Ceviche clásico')).toBeInTheDocument();
      expect(screen.getAllByText('S/ 60.00').length).toBeGreaterThan(0);
      expect(screen.getByText('S/ 8.50')).toBeInTheDocument();
      expect(screen.getByText('S/ 68.50')).toBeInTheDocument();
      // 19:30 UTC is 14:30 in Lima
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
      expect(screen.getByText(/14:35/)).toBeInTheDocument();
    });

    it('avisa a qué correo se envió la confirmación', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue(paid);
      renderPage();

      expect(await screen.findByText('Enviamos la confirmación a maria@correo.com.')).toBeInTheDocument();
    });

    it('con contraentrega la fecha de pago queda pendiente y el estado del pago es pendiente al recibir', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue({ ...cashOrder, paidAt: null });
      renderPage();

      expect(await screen.findByText('Pendiente, se paga al recibir')).toBeInTheDocument();
      expect(screen.getByText('Pago pendiente al recibir')).toBeInTheDocument();
    });

    it('con Recojo no muestra dirección y el delivery queda sin costo', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue({
        ...paid,
        deliveryType: 'RECOJO',
        address: null,
        deliveryPrice: 0,
        total: 60,
      });
      renderPage();

      expect(await screen.findByText('Recibimos tu pago')).toBeInTheDocument();
      expect(screen.getByText('Recojo en tienda')).toBeInTheDocument();
      expect(screen.getByText('Recojo en tienda, sin costo')).toBeInTheDocument();
      expect(screen.queryByText('Entrega a domicilio')).not.toBeInTheDocument();
      expect(screen.queryByText(/Av. Arequipa/)).not.toBeInTheDocument();
    });

    it('"Ver mis pedidos" lleva al historial del perfil', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue(paid);
      renderPage();

      expect(await screen.findByRole('link', { name: 'Ver mis pedidos' })).toHaveAttribute('href', '/perfil/mis-pedidos');
      expect(screen.getByRole('link', { name: 'Seguir viendo la carta' })).toHaveAttribute('href', '/menu');
    });

    it('un pedido sin confirmar no muestra el detalle de confirmación', async () => {
      vi.mocked(checkoutApi.getOrder).mockResolvedValue(pending);
      renderPage();

      await screen.findByText('Estamos confirmando tu pago');
      expect(screen.queryByText('Detalle del pedido')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Ver mis pedidos' })).not.toBeInTheDocument();
    });
  });

  it('con el pedido pendiente avisa que se está confirmando y no vacía el carrito', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue(pending);
    renderPage();

    expect(await screen.findByText('Estamos confirmando tu pago')).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(screen.queryByText('SAL-001042')).not.toBeInTheDocument();
  });

  it('mientras está pendiente vuelve a consultar y pasa a pagado sin recargar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(checkoutApi.getOrder).mockResolvedValueOnce(pending).mockResolvedValue(paid);
    renderPage();
    await screen.findByText('Estamos confirmando tu pago');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_POLL_MS + 100);
    });

    expect(await screen.findByText('Recibimos tu pago')).toBeInTheDocument();
    expect(checkoutApi.getOrder).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
  });

  it('pasado el tope de espera deja de consultar y dice que se le avisará', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(checkoutApi.getOrder).mockResolvedValue(pending);
    renderPage();
    await screen.findByText('Estamos confirmando tu pago');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_WAIT_LIMIT_MS + 100);
    });
    const calls = vi.mocked(checkoutApi.getOrder).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ORDER_POLL_MS * 3);
    });

    expect(await screen.findByText('Tu pago sigue en proceso')).toBeInTheDocument();
    expect(vi.mocked(checkoutApi.getOrder).mock.calls.length).toBe(calls);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('un pedido cancelado dice que el pago no se completó y ofrece volver al carrito sin perderlo', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue({ ...pending, status: 'CANCELADO' });
    renderPage();

    expect(await screen.findByText('El pago no se completó')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al carrito' })).toHaveAttribute('href', '/cart');
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('un pedido pendiente cuyo último pago fue rechazado también dice que no se completó', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue({ ...pending, paymentStatus: 'rejected' });
    renderPage();

    expect(await screen.findByText('El pago no se completó')).toBeInTheDocument();
  });

  it('un pedido ajeno o inexistente muestra que no se encontró', async () => {
    vi.mocked(checkoutApi.getOrder).mockRejectedValue(notFound());
    renderPage();

    expect(await screen.findByText('No encontramos el pedido')).toBeInTheDocument();
  });

  it('sin id o con un id no numérico no consulta y muestra que no se encontró', async () => {
    renderPage('/checkout/resultado?pedido=abc');

    expect(await screen.findByText('No encontramos el pedido')).toBeInTheDocument();
    expect(checkoutApi.getOrder).not.toHaveBeenCalled();
  });

  it('si la consulta falla ofrece reintentar', async () => {
    vi.mocked(checkoutApi.getOrder).mockRejectedValueOnce(new Error('boom')).mockResolvedValue(paid);
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    retry.click();

    expect(await screen.findByText('Recibimos tu pago')).toBeInTheDocument();
  });
});
