import type {
  AdminOrderRow,
  CouponOrdersSummary,
  DeliveryStatus,
  DeliveryType,
  PaymentFilter,
  PaymentStatus,
} from '@/features/admin/admin-order-api';

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREPARACION: 'En preparación',
  LISTO_PARA_RECOGER: 'Listo para recoger',
  LISTO_PARA_ENVIO: 'Listo para envío',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  FALLIDO: 'No entregado',
};

export const TYPE_LABELS: Record<DeliveryType, string> = { ENTREGA: 'Entrega', RECOJO: 'Recojo' };

export const PAYMENT_LABELS: Record<PaymentFilter, string> = {
  ONLINE: 'Online',
  EFECTIVO: 'Efectivo',
  YAPE: 'Billetera virtual',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAGADO: 'Pagado',
  PENDIENTE_COBRO: 'Por cobrar',
};

export function paymentOf(order: Pick<AdminOrderRow, 'paymentMethod' | 'collectionMethod'>): PaymentFilter {
  return order.collectionMethod ?? 'ONLINE';
}

const DATE_TIME = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Lima',
});

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function couponOrdersNoticeText({ pendingPayment, cancelled }: CouponOrdersSummary): string | null {
  const parts: string[] = [];
  if (pendingPayment > 0) {
    parts.push(pendingPayment === 1 ? '1 pago en línea pendiente' : `${pendingPayment} pagos en línea pendientes`);
  }
  if (cancelled > 0) {
    parts.push(cancelled === 1 ? '1 pago en línea vencido' : `${cancelled} pagos en línea vencidos`);
  }
  if (parts.length === 0) return null;
  const total = pendingPayment + cancelled;
  return `Además, ${parts.join(' y ')} ${total === 1 ? 'usó' : 'usaron'} este cupón. No ${
    total === 1 ? 'aparece' : 'aparecen'
  } aquí porque no se ${total === 1 ? 'compró' : 'compraron'}.`;
}
