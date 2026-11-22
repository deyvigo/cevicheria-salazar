import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as checkoutApi from '@/features/checkout/checkout-api';
import * as orderApi from '@/features/perfil/order-api';
import { OrderDetailPage } from '@/features/perfil/order-detail-page';

vi.mock('@/features/checkout/checkout-api');
vi.mock('@/features/perfil/order-api');

const order: checkoutApi.Order = {
  id: 42,
  code: 'SAL-001042',
  status: 'PAGADO',
  deliveryType: 'ENTREGA',
  paymentMethod: 'ONLINE',
  subtotal: 60,
  deliveryPrice: 8.5,
  total: 68.5,
  items: [
    { productId: 1, name: 'Ceviche clásico', unitPrice: 30, quantity: 2, lineTotal: 60 },
    { productId: 2, name: 'Chicha morada', unitPrice: 5, quantity: 1, lineTotal: 5 },
  ],
  paymentStatus: 'approved',
  deliveryCode: '4827',
  collectionMethod: null,
  cashAmount: null,
  change: null,
  customerName: 'María Quispe',
  contactPhone: '987654321',
  deliveryStatus: 'EN_CAMINO',
  deliveryReason: null,
  refundStatus: null,
  address: { label: 'Casa', text: 'Av. Arequipa 123, Lince', reference: 'Puerta verde' },
  purchasedAt: '2026-11-07T19:30:00Z',
  paidAt: '2026-11-07T19:35:00Z',
};

function renderAt(url: string, state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: '/perfil/mis-pedidos', element: <p>lista de pedidos</p> },
      { path: '/perfil/mis-pedidos/:orderId', element: <OrderDetailPage /> },
    ],
    { initialEntries: [{ pathname: url, state }] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function notFoundError() {
  return new AxiosError('no', '404', undefined, undefined, { status: 404 } as AxiosResponse);
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra encabezado, estado grande, recibir, pagar, platos, totales y código de un pedido en curso', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue(order);
    renderAt('/perfil/mis-pedidos/42');

    expect(await screen.findByRole('heading', { name: 'Ceviche clásico y Chicha morada' })).toBeInTheDocument();
    expect(screen.getByText(/SAL-001042/)).toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Progreso del pedido' })).getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(steps[3]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Tu pedido va en camino')).toBeInTheDocument();
    expect(screen.getByText('Casa: Av. Arequipa 123, Lince')).toBeInTheDocument();
    expect(screen.getByText('Pago en línea')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('S/ 68.50')).toBeInTheDocument();
    expect(screen.getByLabelText('Código de entrega 4 8 2 7')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument();
    expect(checkoutApi.getOrder).toHaveBeenCalledWith(42);
  });

  it.each(['ENTREGADO', 'RECHAZADO', 'CANCELADO', 'FALLIDO'] as const)('en estado final %s no muestra el código', async (deliveryStatus) => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue({ ...order, deliveryStatus });
    renderAt('/perfil/mis-pedidos/42');

    await screen.findByRole('heading', { name: /Ceviche clásico/ });
    expect(screen.queryByText('Código de entrega')).not.toBeInTheDocument();
  });

  it('un pedido rechazado muestra mensaje, motivo y reembolso, sin línea de hitos', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue({
      ...order,
      deliveryStatus: 'RECHAZADO',
      deliveryReason: 'Sin insumos',
      refundStatus: 'PENDIENTE',
    });
    renderAt('/perfil/mis-pedidos/42');

    expect(await screen.findByText('No pudimos aceptar tu pedido')).toBeInTheDocument();
    expect(screen.getByText('Sin insumos')).toBeInTheDocument();
    expect(screen.getByText('Te devolveremos el pago')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Progreso del pedido' })).not.toBeInTheDocument();
  });

  it('contraentrega sin cobrar tiene detalle', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue({
      ...order,
      status: 'PENDIENTE_COBRO',
      paymentMethod: 'CONTRAENTREGA',
      collectionMethod: 'YAPE',
      paidAt: null,
    });
    renderAt('/perfil/mis-pedidos/42');

    expect(await screen.findByText('Pendiente, se paga al recibir')).toBeInTheDocument();
  });

  it('un pedido pendiente se cancela desde el detalle y pasa a cancelado sin recargar', async () => {
    const user = userEvent.setup();
    vi.mocked(checkoutApi.getOrder)
      .mockResolvedValueOnce({ ...order, deliveryStatus: 'PENDIENTE' })
      .mockResolvedValue({ ...order, deliveryStatus: 'CANCELADO', deliveryReason: 'Cancelado por el cliente' });
    vi.mocked(orderApi.cancelMyOrder).mockResolvedValue();
    renderAt('/perfil/mis-pedidos/42');

    await user.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Cancelar pedido' })).getByRole('button', { name: 'Cancelar pedido' }));

    expect(orderApi.cancelMyOrder).toHaveBeenCalledWith(42);
    expect(await screen.findByText('Tu pedido fue cancelado')).toBeInTheDocument();
    expect(screen.getByText('Cancelado por el cliente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument();
  });

  it('sin pagar (pago en línea pendiente) responde no encontrado', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue({ ...order, status: 'PENDIENTE_PAGO', deliveryCode: null });
    renderAt('/perfil/mis-pedidos/42');

    expect(await screen.findByRole('heading', { name: 'No encontramos este pedido' })).toBeInTheDocument();
    expect(screen.queryByText('SAL-001042')).not.toBeInTheDocument();
  });

  it('un pedido ajeno o inexistente (404) responde no encontrado', async () => {
    vi.mocked(checkoutApi.getOrder).mockRejectedValue(notFoundError());
    renderAt('/perfil/mis-pedidos/99');

    expect(await screen.findByRole('heading', { name: 'No encontramos este pedido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mis pedidos' })).toBeInTheDocument();
  });

  it.each(['abc', '0', '-3', '4.5'])('un identificador inválido (%s) no llama a la API', (value) => {
    renderAt(`/perfil/mis-pedidos/${value}`);

    expect(screen.getByRole('heading', { name: 'No encontramos este pedido' })).toBeInTheDocument();
    expect(checkoutApi.getOrder).not.toHaveBeenCalled();
  });

  it('si falla la carga ofrece reintentar y volver', async () => {
    const user = userEvent.setup();
    vi.mocked(checkoutApi.getOrder).mockRejectedValueOnce(new Error('boom')).mockResolvedValue(order);
    renderAt('/perfil/mis-pedidos/42');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu pedido.');
    expect(screen.getByRole('link', { name: 'Volver a mis pedidos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: /Ceviche clásico/ })).toBeInTheDocument();
  });

  it('volver conserva la página de la lista de la que se vino', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue(order);
    renderAt('/perfil/mis-pedidos/42', { page: 3 });

    expect(await screen.findByRole('link', { name: 'Volver a mis pedidos' })).toHaveAttribute(
      'href',
      '/perfil/mis-pedidos?page=3',
    );
  });

  it('volver sin página previa va a la lista', async () => {
    vi.mocked(checkoutApi.getOrder).mockResolvedValue(order);
    renderAt('/perfil/mis-pedidos/42');

    expect(await screen.findByRole('link', { name: 'Volver a mis pedidos' })).toHaveAttribute('href', '/perfil/mis-pedidos');
  });
});
