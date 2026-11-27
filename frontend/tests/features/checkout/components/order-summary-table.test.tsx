import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Order } from '@/features/checkout/checkout-api';
import { OrderSummaryTable } from '@/features/checkout/components/order-summary-table';

const order: Order = {
  id: 1,
  code: 'SAL-001042',
  status: 'PAGADO',
  deliveryType: 'ENTREGA',
  paymentMethod: 'ONLINE',
  subtotal: 60,
  discount: 0,
  couponCode: null,
  deliveryPrice: 8.5,
  total: 68.5,
  items: [],
  paymentStatus: 'approved',
  deliveryCode: '4827',
  collectionMethod: null,
  cashAmount: null,
  change: null,
  customerName: 'María Quispe',
  contactPhone: '987654321',
  deliveryStatus: 'PENDIENTE',
  deliveryReason: null,
  refundStatus: null,
  address: { label: 'Casa', text: 'Av. Arequipa 123, Lince', reference: 'Puerta verde' },
  purchasedAt: '2026-11-07T19:30:00Z',
  paidAt: '2026-11-07T19:35:00Z',
};

describe('OrderSummaryTable', () => {
  it('sin cupón no muestra la fila de descuento', () => {
    render(<OrderSummaryTable order={order} />);

    expect(screen.queryByText(/Descuento/)).not.toBeInTheDocument();
    expect(screen.getByText('Total').nextElementSibling).toHaveTextContent('S/ 68.50');
  });

  it('con cupón muestra el código y el descuento restado', () => {
    render(<OrderSummaryTable order={{ ...order, discount: 6, couponCode: 'CEVICHE10', total: 62.5 }} />);

    expect(screen.getByText('Descuento (CEVICHE10)').nextElementSibling).toHaveTextContent('-S/ 6.00');
    expect(screen.getByText('Total').nextElementSibling).toHaveTextContent('S/ 62.50');
  });
});
