import { useQuery } from '@tanstack/react-query';
import { getDeliveryCost } from '@/features/checkout/checkout-api';

export function useDeliveryCost(addressId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['delivery-cost', addressId],
    queryFn: () => getDeliveryCost(addressId as number),
    enabled: enabled && addressId !== null,
    // Zones can change at any time and a cached value would belong to another selection
    staleTime: 0,
    gcTime: 0,
  });
}
