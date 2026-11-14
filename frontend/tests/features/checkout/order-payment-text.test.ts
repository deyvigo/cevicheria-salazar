import { describe, expect, it } from 'vitest';
import type { Order } from '@/features/checkout/checkout-api';
import { collectionSummary, paymentMethodText, paymentStatusText } from '@/features/checkout/order-payment-text';

const base: Order = {
  id: 1,
  code: 'SAL-001042',
  status: 'PENDIENTE_COBRO',
  deliveryType: 'ENTREGA',
  paymentMethod: 'CONTRAENTREGA',
  subtotal: 60,
  deliveryPrice: 8.5,
  total: 68.5,
  items: [],
  paymentStatus: null,
  deliveryCode: '4827',
  collectionMethod: 'EFECTIVO',
  cashAmount: 100,
  change: 31.5,
  customerName: 'María Quispe',
  deliveryStatus: 'EN_PREPARACION',
  address: null,
  purchasedAt: '2026-11-07T19:30:00Z',
  paidAt: null,
};

describe('order-payment-text', () => {
  it('efectivo con monto muestra el vuelto', () => {
    expect(collectionSummary(base)).toBe('Pagarás con S/ 100.00 en efectivo (vuelto S/ 31.50).');
  });

  it('efectivo sin monto y Yape hablan de recibir o recoger según la entrega', () => {
    expect(collectionSummary({ ...base, cashAmount: null, change: null })).toBe(
      'Pagarás en efectivo al recibir tu pedido.',
    );
    expect(collectionSummary({ ...base, collectionMethod: 'YAPE', cashAmount: null, change: null })).toBe(
      'Pagarás con Yape al recibir tu pedido.',
    );
    expect(
      collectionSummary({ ...base, deliveryType: 'RECOJO', collectionMethod: 'YAPE', cashAmount: null, change: null }),
    ).toBe('Pagarás con Yape al recoger tu pedido.');
  });

  it('el pago en línea se describe sin detalle de cobro', () => {
    expect(paymentMethodText({ ...base, paymentMethod: 'ONLINE', collectionMethod: null })).toBe('Pago en línea');
  });

  it('el estado del pago distingue pagado de pendiente al recibir', () => {
    expect(paymentStatusText({ ...base, status: 'PAGADO' })).toBe('Pagado');
    expect(paymentStatusText(base)).toBe('Pago pendiente al recibir');
  });
});
