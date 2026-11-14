import { formatPrice } from '@/features/catalogo/format';
import type { Order } from '@/features/checkout/checkout-api';

export const PAYMENT_PENDING_TEXT = 'Pendiente, se paga al recibir';

export function collectionSummary(order: Order): string {
  const when = order.deliveryType === 'ENTREGA' ? 'al recibir' : 'al recoger';
  if (order.collectionMethod === 'YAPE') return `Pagarás con Yape ${when} tu pedido.`;
  if (order.cashAmount !== null && order.change !== null) {
    return `Pagarás con ${formatPrice(order.cashAmount)} en efectivo (vuelto ${formatPrice(order.change)}).`;
  }
  return `Pagarás en efectivo ${when} tu pedido.`;
}

export function paymentMethodText(order: Order): string {
  return order.paymentMethod === 'ONLINE' ? 'Pago en línea' : collectionSummary(order);
}

export function paymentStatusText(order: Order): string {
  return order.status === 'PAGADO' ? 'Pagado' : 'Pago pendiente al recibir';
}
