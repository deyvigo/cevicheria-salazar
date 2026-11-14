import type {
  AdminOrderRow,
  DeliveryStatus,
  DeliveryType,
  PaymentFilter,
  PaymentStatus,
} from '@/features/admin/admin-order-api';

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  EN_PREPARACION: 'En preparación',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
};

export const ADVANCE_LABELS: Record<Exclude<DeliveryStatus, 'ENTREGADO'>, string> = {
  EN_PREPARACION: 'Marcar en camino',
  EN_CAMINO: 'Marcar entregado',
};

export const TYPE_LABELS: Record<DeliveryType, string> = { ENTREGA: 'Entrega', RECOJO: 'Recojo' };

export const PAYMENT_LABELS: Record<PaymentFilter, string> = {
  ONLINE: 'Online',
  EFECTIVO: 'Efectivo',
  YAPE: 'Yape',
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
