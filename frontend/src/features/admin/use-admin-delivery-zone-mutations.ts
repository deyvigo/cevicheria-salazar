import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDeliveryZone,
  deleteDeliveryZone,
  updateDeliveryZone,
  type DeliveryZonePayload,
} from '@/features/admin/admin-delivery-zone-api';
import { ADMIN_DELIVERY_ZONES_QUERY_KEY } from '@/features/admin/use-admin-delivery-zones';

function useInvalidateZones() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_DELIVERY_ZONES_QUERY_KEY });
}

export function useCreateDeliveryZone() {
  const invalidate = useInvalidateZones();
  return useMutation({
    mutationFn: (payload: DeliveryZonePayload) => createDeliveryZone(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateDeliveryZone() {
  const invalidate = useInvalidateZones();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DeliveryZonePayload }) => updateDeliveryZone(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDeliveryZone() {
  const invalidate = useInvalidateZones();
  return useMutation({
    mutationFn: (id: number) => deleteDeliveryZone(id),
    onSuccess: invalidate,
  });
}
