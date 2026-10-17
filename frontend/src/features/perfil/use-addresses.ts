import { useQuery } from '@tanstack/react-query';
import { listAddresses } from '@/features/perfil/address-api';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

export function useAddresses() {
  return useQuery({ queryKey: ADDRESSES_QUERY_KEY, queryFn: listAddresses });
}
