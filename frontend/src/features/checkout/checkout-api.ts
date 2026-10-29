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
