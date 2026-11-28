import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Order } from '@/features/checkout/checkout-api';
import { OrderDetailInfo } from '@/features/perfil/components/order-detail-info';

const base: Order = {
  id: 42,
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

describe('OrderDetailInfo', () => {
  it('entrega pagada en línea muestra dirección, referencia, pago y fechas', () => {
    render(<OrderDetailInfo order={base} />);

    expect(screen.getByText('Entrega a domicilio')).toBeInTheDocument();
    expect(screen.getByText('Casa: Av. Arequipa 123, Lince')).toBeInTheDocument();
    expect(screen.getByText('Referencia: Puerta verde')).toBeInTheDocument();
    expect(screen.getByText('Teléfono de contacto')).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();
    expect(screen.getByText('Pago en línea')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente, se paga al recibir')).not.toBeInTheDocument();
    expect(screen.getAllByText(/7 nov\.? 2026/)).toHaveLength(2);
  });

  it('sin referencia no escribe la línea ni "null"', () => {
    render(<OrderDetailInfo order={{ ...base, address: { label: 'Casa', text: 'Av. Arequipa 123', reference: null } }} />);

    expect(screen.queryByText(/Referencia/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('null');
  });

  it('recojo no muestra dirección', () => {
    render(<OrderDetailInfo order={{ ...base, deliveryType: 'RECOJO', address: null }} />);

    expect(screen.getByText('Recojo en tienda')).toBeInTheDocument();
    expect(screen.queryByText('Entrega a domicilio')).not.toBeInTheDocument();
  });

  it('contraentrega en efectivo muestra el vuelto y la fecha de pago pendiente', () => {
    render(
      <OrderDetailInfo
        order={{
          ...base,
          status: 'PENDIENTE_COBRO',
          paymentMethod: 'CONTRAENTREGA',
          collectionMethod: 'EFECTIVO',
          cashAmount: 100,
          change: 31.5,
          paidAt: null,
        }}
      />,
    );

    expect(screen.getByText(/Pagarás con S\/ 100.00 en efectivo \(vuelto S\/ 31.50\)/)).toBeInTheDocument();
    expect(screen.getByText('Pago pendiente al recibir')).toBeInTheDocument();
    expect(screen.getByText('Pendiente, se paga al recibir')).toBeInTheDocument();
  });

  it('contraentrega con Yape solo muestra el medio', () => {
    render(
      <OrderDetailInfo
        order={{ ...base, status: 'PENDIENTE_COBRO', paymentMethod: 'CONTRAENTREGA', collectionMethod: 'YAPE', paidAt: null }}
      />,
    );

    expect(screen.getByText(/Pagarás con billetera virtual \(Yape o Plin\) al recibir/)).toBeInTheDocument();
    expect(screen.queryByText(/vuelto/)).not.toBeInTheDocument();
  });
});
