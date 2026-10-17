import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAddress,
  deleteAddress,
  updateAddress,
  type AddressPayload,
} from '@/features/perfil/address-api';
import { ADDRESSES_QUERY_KEY } from '@/features/perfil/use-addresses';

export function useInvalidateAddresses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
}

export function useCreateAddress() {
  const invalidate = useInvalidateAddresses();
  return useMutation({
    mutationFn: (payload: AddressPayload) => createAddress(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateAddress() {
  const invalidate = useInvalidateAddresses();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AddressPayload }) => updateAddress(id, payload),
    onSuccess: invalidate,
  });
}

// The caller invalidates the list once the card has faded out, otherwise the refetch would remove it abruptly
export function useDeleteAddress() {
  return useMutation({
    mutationFn: (id: number) => deleteAddress(id),
  });
}
