import type { DeliveryStatus } from '@/features/perfil/order-api';

export const DELIVERY_STATUS_STEPS: { status: DeliveryStatus; label: string }[] = [
  { status: 'EN_PREPARACION', label: 'En preparación' },
  { status: 'EN_CAMINO', label: 'En camino' },
  { status: 'ENTREGADO', label: 'Entregado' },
];

export function deliveryStatusLabel(status: DeliveryStatus): string {
  return DELIVERY_STATUS_STEPS.find((step) => step.status === status)?.label ?? DELIVERY_STATUS_STEPS[0].label;
}
