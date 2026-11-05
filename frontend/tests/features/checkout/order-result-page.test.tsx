import { act, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { useCartStore } from '@/features/carrito/cart-store';
import * as checkoutApi from '@/features/checkout/checkout-api';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { ORDER_WAIT_LIMIT_MS, OrderResultPage } from '@/features/checkout/order-result-page';
import { ORDER_POLL_MS } from '@/features/checkout/use-order';

vi.mock('@/features/checkout/checkout-api');

const paid: checkoutApi.Order = {
  id: 42,
  code: 'SAL-001042',
  status: 'PAGADO',
  deliveryType: 'ENTREGA',
  paymentMethod: 'ONLINE',
  subtotal: 60,
  deliveryPrice: 8.5,
  total: 68.5,
  items: [],
  paymentStatus: 'approved',
  deliveryCode: '4827',
  collectionMethod: null,
  cashAmount: null,
  change: null,
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
    ],
    { initialEntries: [url] },
  );
  render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>,
  );
}

function notFound() {
  return new AxiosError('nf', '404', undefined, undefined, { status: 404 } as AxiosResponse);
}

beforeEach(() => {
  vi.resetAllMocks();
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
