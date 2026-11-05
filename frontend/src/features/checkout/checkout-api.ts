import { api } from '@/lib/api';

export interface DeliveryCost {
  covered: boolean;
  price: number;
  zone: string | null;
}

export async function getDeliveryCost(addressId: number): Promise<DeliveryCost> {
  const { data } = await api.get<DeliveryCost>('/pedidos/costo-delivery', { params: { direccionId: addressId } });
  return data;
}

export type OrderStatus = 'PENDIENTE_PAGO' | 'PAGADO' | 'CANCELADO';
export type OrderDeliveryType = 'ENTREGA' | 'RECOJO';

export interface CreateOrderPayload {
  items: Array<{ productId: number; quantity: number }>;
  deliveryType: OrderDeliveryType;
  addressId: number | null;
  paymentMethod: 'ONLINE';
}

export interface CreatedOrder {
  orderId: number;
  checkoutUrl: string;
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
  // Only present once the order is paid
  deliveryCode: string | null;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreatedOrder> {
  const { data } = await api.post<CreatedOrder>('/pedidos', payload);
  return data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await api.get<Order>(`/pedidos/${id}`);
  return data;
}
