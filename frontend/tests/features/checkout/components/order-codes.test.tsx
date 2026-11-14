import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Order } from '@/features/checkout/checkout-api';
import { OrderCodes } from '@/features/checkout/components/order-codes';

const order: Order = {
  id: 1,
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
  customerName: 'María Quispe',
  deliveryStatus: 'EN_PREPARACION',
  address: { label: 'Casa', text: 'Av. Arequipa 123, Lince', reference: 'Puerta verde' },
  purchasedAt: '2026-11-07T19:30:00Z',
  paidAt: '2026-11-07T19:35:00Z',
};

describe('OrderCodes', () => {
  it('muestra el código de pedido y el de entrega', () => {
    render(<OrderCodes order={order} />);

    expect(screen.getByText('Código de pedido')).toBeInTheDocument();
    expect(screen.getByText('SAL-001042')).toBeInTheDocument();
    expect(screen.getByText('Código de entrega')).toBeInTheDocument();
    expect(screen.getByText('4827')).toBeInTheDocument();
  });

  it('el código de entrega se anuncia dígito a dígito', () => {
    render(<OrderCodes order={order} />);

    expect(screen.getByLabelText('Código de entrega 4 8 2 7')).toBeInTheDocument();
  });

  it('con Entrega la indicación habla del repartidor', () => {
    render(<OrderCodes order={order} />);

    expect(screen.getByText('Díselo al repartidor al recibir tu pedido.')).toBeInTheDocument();
  });

  it('con Recojo la indicación habla de la tienda', () => {
    render(<OrderCodes order={{ ...order, deliveryType: 'RECOJO' }} />);

    expect(screen.getByText('Díselo al personal de la tienda al recoger tu pedido.')).toBeInTheDocument();
  });
});
