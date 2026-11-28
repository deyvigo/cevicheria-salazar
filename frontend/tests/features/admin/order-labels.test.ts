import { describe, expect, it } from 'vitest';
import { couponOrdersNoticeText } from '@/features/admin/order-labels';

describe('couponOrdersNoticeText', () => {
  it('nombra los pagos pendientes y los vencidos, en plural', () => {
    expect(couponOrdersNoticeText({ pendingPayment: 2, cancelled: 3 })).toBe(
      'Además, 2 pagos en línea pendientes y 3 pagos en línea vencidos usaron este cupón. No aparecen aquí porque no se compraron.',
    );
  });

  it('omite la parte en cero y usa singular con un solo pedido', () => {
    expect(couponOrdersNoticeText({ pendingPayment: 1, cancelled: 0 })).toBe(
      'Además, 1 pago en línea pendiente usó este cupón. No aparece aquí porque no se compró.',
    );
    expect(couponOrdersNoticeText({ pendingPayment: 0, cancelled: 1 })).toBe(
      'Además, 1 pago en línea vencido usó este cupón. No aparece aquí porque no se compró.',
    );
  });

  it('suma ambos para el plural del verbo', () => {
    expect(couponOrdersNoticeText({ pendingPayment: 1, cancelled: 1 })).toBe(
      'Además, 1 pago en línea pendiente y 1 pago en línea vencido usaron este cupón. No aparecen aquí porque no se compraron.',
    );
  });

  it('sin pedidos no comprados no hay aviso', () => {
    expect(couponOrdersNoticeText({ pendingPayment: 0, cancelled: 0 })).toBeNull();
  });
});
