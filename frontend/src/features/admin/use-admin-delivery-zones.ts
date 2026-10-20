import { useQuery } from '@tanstack/react-query';
import { listDeliveryZones } from '@/features/admin/admin-delivery-zone-api';

export const ADMIN_DELIVERY_ZONES_QUERY_KEY = ['admin', 'delivery-zones'] as const;

export function useAdminDeliveryZones() {
  return useQuery({ queryKey: ADMIN_DELIVERY_ZONES_QUERY_KEY, queryFn: listDeliveryZones });
}
