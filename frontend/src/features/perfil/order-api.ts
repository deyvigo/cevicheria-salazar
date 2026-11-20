import type { Page } from '@/features/catalogo/catalog-api';
import { api } from '@/lib/api';

export type DeliveryStatus =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_PREPARACION'
  | 'LISTO_PARA_RECOGER'
  | 'LISTO_PARA_ENVIO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'RECHAZADO'
  | 'CANCELADO'
  | 'FALLIDO';
export type OrderDeliveryType = 'ENTREGA' | 'RECOJO';
export type RefundStatus = 'PENDIENTE' | 'REEMBOLSADO';

export interface OrderSummary {
  id: number;
  code: string;
  itemNames: string[];
  total: number;
  purchasedAt: string;
  deliveryStatus: DeliveryStatus;
  deliveryType: OrderDeliveryType;
  deliveryReason: string | null;
  refundStatus: RefundStatus | null;
}

export async function listMyOrders(page: number): Promise<Page<OrderSummary>> {
  const { data } = await api.get<Page<OrderSummary>>('/orders', { params: { page } });
  return data;
}

export async function cancelMyOrder(id: number): Promise<void> {
  await api.post(`/orders/${id}/cancel`);
}
