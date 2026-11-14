import type { Page } from '@/features/catalogo/catalog-api';
import type { DeliveryStatus } from '@/features/perfil/order-api';
import { api } from '@/lib/api';

export type { DeliveryStatus };
export type DeliveryType = 'ENTREGA' | 'RECOJO';
export type PaymentMethod = 'ONLINE' | 'CONTRAENTREGA';
export type CollectionMethod = 'EFECTIVO' | 'YAPE';
export type PaymentStatus = 'PAGADO' | 'PENDIENTE_COBRO';
export type OrderSortField = 'code' | 'date' | 'customer' | 'zone' | 'total' | 'deliveryStatus';
export type SortDirection = 'asc' | 'desc';
export type StageFilter = 'ACTIVE' | 'ALL' | DeliveryStatus;
export type PaymentFilter = 'ONLINE' | 'EFECTIVO' | 'YAPE';

export interface AdminOrderRow {
  id: number;
  code: string;
  purchasedAt: string;
  customerName: string;
  deliveryType: DeliveryType;
  zoneName: string | null;
  paymentMethod: PaymentMethod;
  collectionMethod: CollectionMethod | null;
  paymentStatus: PaymentStatus;
  total: number;
  cashChange: number | null;
  deliveryStatus: DeliveryStatus;
}

export interface AdminOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AdminOrderDetail {
  order: AdminOrderRow;
  customerPhone: string;
  addressText: string | null;
  addressReference: string | null;
  items: AdminOrderItem[];
  subtotal: number;
  discount: number;
  deliveryPrice: number;
  cashAmount: number | null;
}

export interface OrderListParams {
  page: number;
  sort: OrderSortField;
  dir: SortDirection;
  q?: string;
  deliveryStatus: StageFilter;
  type?: DeliveryType;
  payment?: PaymentFilter;
  paymentStatus?: PaymentStatus;
  zone?: string;
  from?: string;
  to?: string;
}

export async function listAdminOrders(params: OrderListParams): Promise<Page<AdminOrderRow>> {
  const { data } = await api.get<Page<AdminOrderRow>>('/admin/orders', { params });
  return data;
}

export async function getAdminOrder(id: number): Promise<AdminOrderDetail> {
  const { data } = await api.get<AdminOrderDetail>(`/admin/orders/${id}`);
  return data;
}

export async function advanceAdminOrder(id: number, from: DeliveryStatus): Promise<AdminOrderRow> {
  const { data } = await api.patch<AdminOrderRow>(`/admin/orders/${id}/delivery-status`, null, { params: { from } });
  return data;
}

export async function listAdminOrderZones(): Promise<string[]> {
  const { data } = await api.get<string[]>('/admin/orders/zones');
  return data;
}

export function adminOrderEventsUrl(): string {
  return `${api.defaults.baseURL}/admin/orders/events`;
}
