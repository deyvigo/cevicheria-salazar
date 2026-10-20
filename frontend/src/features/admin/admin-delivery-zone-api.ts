import type { ZoneColorId } from '@/features/admin/zone-colors';
import type { ZonePoint } from '@/features/admin/zone-geometry';
import { api } from '@/lib/api';

export interface DeliveryZone {
  id: number;
  name: string;
  price: number;
  color: ZoneColorId;
  active: boolean;
  coordinates: ZonePoint[];
}

export interface DeliveryZonePayload {
  name: string;
  price: number;
  color: ZoneColorId;
  active: boolean;
  coordinates: ZonePoint[];
}

export async function listDeliveryZones(): Promise<DeliveryZone[]> {
  const { data } = await api.get<DeliveryZone[]>('/admin/delivery-zones');
  return data;
}

export async function createDeliveryZone(payload: DeliveryZonePayload): Promise<DeliveryZone> {
  const { data } = await api.post<DeliveryZone>('/admin/delivery-zones', payload);
  return data;
}

export async function updateDeliveryZone(id: number, payload: DeliveryZonePayload): Promise<DeliveryZone> {
  const { data } = await api.put<DeliveryZone>(`/admin/delivery-zones/${id}`, payload);
  return data;
}

export async function deleteDeliveryZone(id: number): Promise<void> {
  await api.delete(`/admin/delivery-zones/${id}`);
}
