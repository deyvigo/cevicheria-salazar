import type { DeliveryStatus } from '@/features/perfil/order-api';
import { api } from '@/lib/api';

export interface DeliveryCost {
  covered: boolean;
  price: number;
  zone: string | null;
}

export async function getDeliveryCost(addressId: number): Promise<DeliveryCost> {
  const { data } = await api.get<DeliveryCost>('/orders/delivery-cost', { params: { addressId } });
  return data;
}

export type OrderStatus = 'PENDIENTE_PAGO' | 'PENDIENTE_COBRO' | 'PAGADO' | 'CANCELADO';
export type OrderCollectionMethod = 'EFECTIVO' | 'YAPE';
export type OrderDeliveryType = 'ENTREGA' | 'RECOJO';

export interface CreateOrderPayload {
  items: Array<{ productId: number; quantity: number }>;
  deliveryType: OrderDeliveryType;
  addressId: number | null;
  paymentMethod: 'ONLINE' | 'CONTRAENTREGA';
  // Only with CONTRAENTREGA
  collection?: { method: OrderCollectionMethod; cashAmount: number | null };
}

export interface CreatedOrder {
  orderId: number;
  // Null for cash on delivery: there is no provider to go to
  checkoutUrl: string | null;
}

export interface Order {
  id: number;
  code: string;
  status: OrderStatus;
  deliveryType: OrderDeliveryType;
  paymentMethod: 'ONLINE' | 'CONTRAENTREGA';
  subtotal: number;
  deliveryPrice: number;
  total: number;
  items: Array<{ productId: number; name: string; unitPrice: number; quantity: number; lineTotal: number }>;
  // Last payment status reported by the provider, e.g. "rejected"; null until a payment is attempted
  paymentStatus: string | null;
  // Only present once the order is confirmed (paid, or to be collected on delivery)
  deliveryCode: string | null;
  collectionMethod: OrderCollectionMethod | null;
  cashAmount: number | null;
  change: number | null;
  // The following only come with a confirmed order
  customerName: string | null;
  deliveryStatus: DeliveryStatus;
  // Null with Recojo en tienda
  address: { label: string; text: string; reference: string | null } | null;
  purchasedAt: string;
  // Null until the order is paid (cash on delivery: when it is collected)
  paidAt: string | null;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreatedOrder> {
  const { data } = await api.post<CreatedOrder>('/orders', payload);
  return data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}
