import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderCard, orderTitle } from '@/features/perfil/components/order-card';
import type { OrderSummary } from '@/features/perfil/order-api';

const order: OrderSummary = {
  id: 1,
  code: 'SAL-001042',
  itemNames: ['Ceviche clásico', 'Chicharrón de pota', 'Chicha morada'],
  total: 32,
  purchasedAt: '2026-11-07T14:00:00Z',
  deliveryStatus: 'EN_CAMINO',
};

describe('OrderCard', () => {
  it('muestra nombre, código, precio, fecha y estado', () => {
    render(<OrderCard order={order} />);

    expect(screen.getByRole('heading', { name: 'Ceviche clásico, Chicharrón de pota y 1 más' })).toBeInTheDocument();
    expect(screen.getByText('SAL-001042')).toBeInTheDocument();
    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
    expect(screen.getByText(/7 nov/)).toBeInTheDocument();
    expect(screen.getByText('En camino')).toBeInTheDocument();
  });

  it('usa la fecha de Lima: las 23:30 en Lima siguen siendo el mismo día', () => {
    render(<OrderCard order={{ ...order, purchasedAt: '2026-11-08T04:30:00Z' }} />);

    expect(screen.getByText(/7 nov/)).toBeInTheDocument();
  });

  it('arma el título según cuántos platos hay', () => {
    expect(orderTitle(['A'])).toBe('A');
    expect(orderTitle(['A', 'B'])).toBe('A y B');
    expect(orderTitle(['A', 'B', 'C', 'D'])).toBe('A, B y 2 más');
    expect(orderTitle([])).toBe('Pedido');
  });
});
