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
  const { data } = await api.get<Address[]>('/profile/addresses');
  return data;
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post<Address>('/profile/addresses', payload);
  return data;
}

export async function updateAddress(id: number, payload: AddressPayload): Promise<Address> {
  const { data } = await api.put<Address>(`/profile/addresses/${id}`, payload);
  return data;
}

export async function deleteAddress(id: number): Promise<void> {
  await api.delete(`/profile/addresses/${id}`);
}
