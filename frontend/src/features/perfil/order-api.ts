import type { Page } from '@/features/catalogo/catalog-api';
import { api } from '@/lib/api';

export type DeliveryStatus = 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO';

export interface OrderSummary {
  id: number;
  code: string;
  itemNames: string[];
  total: number;
  purchasedAt: string;
  deliveryStatus: DeliveryStatus;
}

export async function listMyOrders(page: number): Promise<Page<OrderSummary>> {
  const { data } = await api.get<Page<OrderSummary>>('/orders', { params: { page } });
  return data;
}
