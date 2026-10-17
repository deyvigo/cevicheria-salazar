import { api } from '@/lib/api';

export interface Address {
  id: number;
  label: string;
  address: string;
  reference: string | null;
  latitude: number;
  longitude: number;
}

export interface AddressPayload {
  label: string;
  address: string;
  reference: string | null;
  latitude: number;
  longitude: number;
}

export async function listAddresses(): Promise<Address[]> {
  const { data } = await api.get<Address[]>('/perfil/direcciones');
  return data;
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post<Address>('/perfil/direcciones', payload);
  return data;
}

export async function updateAddress(id: number, payload: AddressPayload): Promise<Address> {
  const { data } = await api.put<Address>(`/perfil/direcciones/${id}`, payload);
  return data;
}

export async function deleteAddress(id: number): Promise<void> {
  await api.delete(`/perfil/direcciones/${id}`);
}
