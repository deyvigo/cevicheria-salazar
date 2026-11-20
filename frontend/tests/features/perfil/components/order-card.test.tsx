import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderCard, orderTitle } from '@/features/perfil/components/order-card';
import * as orderApi from '@/features/perfil/order-api';
import type { OrderSummary } from '@/features/perfil/order-api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/order-api');

const order: OrderSummary = {
  id: 1,
  code: 'SAL-001042',
  itemNames: ['Ceviche clásico', 'Chicharrón de pota', 'Chicha morada'],
  total: 32,
  purchasedAt: '2026-11-07T14:00:00Z',
  deliveryStatus: 'EN_CAMINO',
  deliveryType: 'ENTREGA',
  deliveryReason: null,
  refundStatus: null,
};

function renderCard(value: OrderSummary) {
  return render(
    <MemoryRouter initialEntries={['/perfil/mis-pedidos']}>
      <QueryWrapper>
        <Routes>
          <Route path="/perfil/mis-pedidos" element={<OrderCard order={value} page={2} />} />
          <Route path="/perfil/mis-pedidos/:orderId" element={<p>detalle del pedido</p>} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  );
}

describe('OrderCard', () => {
  it('muestra nombre, código, precio, fecha y estado', () => {
    renderCard(order);

    expect(screen.getByRole('heading', { name: /^Ceviche clásico, Chicharrón de pota y 1 más/ })).toBeInTheDocument();
    expect(screen.getByText('SAL-001042')).toBeInTheDocument();
    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
    expect(screen.getByText(/7 nov/)).toBeInTheDocument();
    expect(screen.getByText('En camino')).toBeInTheDocument();
    expect(screen.getByText('Tu pedido va en camino')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument();
  });

  it('un pedido rechazado muestra el mensaje, el motivo y que le devolveremos el pago', () => {
    renderCard({ ...order, deliveryStatus: 'RECHAZADO', deliveryReason: 'Sin insumos', refundStatus: 'PENDIENTE' });

    expect(screen.getByText('No pudimos aceptar tu pedido')).toBeInTheDocument();
    expect(screen.getByText('Sin insumos')).toBeInTheDocument();
    expect(screen.getByText('Te devolveremos el pago')).toBeInTheDocument();
    expect(screen.queryByTestId('delivery-dot')).not.toBeInTheDocument();
  });

  it('un pedido pendiente se puede cancelar tras confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.cancelMyOrder).mockResolvedValue();
    renderCard({ ...order, deliveryStatus: 'PENDIENTE' });

    expect(screen.getByText('Recibimos tu pedido, esperando confirmación')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Cancelar pedido' })).getByRole('button', { name: 'Cancelar pedido' }));

    expect(orderApi.cancelMyOrder).toHaveBeenCalledWith(1);
  });

  it('usa la fecha de Lima: las 23:30 en Lima siguen siendo el mismo día', () => {
    renderCard({ ...order, purchasedAt: '2026-11-08T04:30:00Z' });

    expect(screen.getByText(/7 nov/)).toBeInTheDocument();
  });

  it('la tarjeta entera lleva al detalle y el enlace se anuncia con el código', async () => {
    const user = userEvent.setup();
    renderCard(order);

    const link = screen.getByRole('link', { name: /ver detalle del pedido SAL-001042/ });
    expect(link).toHaveAttribute('href', '/perfil/mis-pedidos/1');
    await user.click(link);

    expect(screen.getByText('detalle del pedido')).toBeInTheDocument();
  });

  it('el botón de cancelar abre el diálogo y no navega al detalle', async () => {
    const user = userEvent.setup();
    renderCard({ ...order, deliveryStatus: 'PENDIENTE' });

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));

    expect(screen.getByRole('dialog', { name: 'Cancelar pedido' })).toBeInTheDocument();
    expect(screen.queryByText('detalle del pedido')).not.toBeInTheDocument();
  });

  it('arma el título según cuántos platos hay', () => {
    expect(orderTitle(['A'])).toBe('A');
    expect(orderTitle(['A', 'B'])).toBe('A y B');
    expect(orderTitle(['A', 'B', 'C', 'D'])).toBe('A, B y 2 más');
    expect(orderTitle([])).toBe('Pedido');
  });
});
