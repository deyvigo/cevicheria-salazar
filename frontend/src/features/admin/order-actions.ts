import type { AdminOrderRow, DeliveryStatus } from '@/features/admin/admin-order-api';

export interface OrderAction {
  to: DeliveryStatus;
  label: string;
  // Rejecting, cancelling or failing an order asks the administrator why
  needsReason?: boolean;
  // Delivered is final: the customer must give the delivery code they received when buying
  needsCode?: boolean;
}

export function primaryAction(order: Pick<AdminOrderRow, 'deliveryStatus' | 'deliveryType'>): OrderAction | null {
  const pickup = order.deliveryType === 'RECOJO';
  switch (order.deliveryStatus) {
    case 'PENDIENTE':
      return { to: 'CONFIRMADO', label: 'Aceptar' };
    case 'CONFIRMADO':
      return { to: 'EN_PREPARACION', label: 'Empezar preparación' };
    case 'EN_PREPARACION':
      return pickup
        ? { to: 'LISTO_PARA_RECOGER', label: 'Listo para recoger' }
        : { to: 'LISTO_PARA_ENVIO', label: 'Listo para envío' };
    case 'LISTO_PARA_ENVIO':
      return { to: 'EN_CAMINO', label: 'Marcar en camino' };
    case 'LISTO_PARA_RECOGER':
    case 'EN_CAMINO':
      return { to: 'ENTREGADO', label: 'Marcar entregado', needsCode: true };
    default:
      return null;
  }
}

export function secondaryActions(order: Pick<AdminOrderRow, 'deliveryStatus'>): OrderAction[] {
  switch (order.deliveryStatus) {
    case 'PENDIENTE':
      return [{ to: 'RECHAZADO', label: 'Rechazar', needsReason: true }];
    case 'CONFIRMADO':
    case 'EN_PREPARACION':
    case 'LISTO_PARA_ENVIO':
      return [{ to: 'CANCELADO', label: 'Cancelar', needsReason: true }];
    case 'LISTO_PARA_RECOGER':
      return [
        { to: 'CANCELADO', label: 'Cancelar', needsReason: true },
        { to: 'FALLIDO', label: 'No se entregó', needsReason: true },
      ];
    case 'EN_CAMINO':
      return [{ to: 'FALLIDO', label: 'No se entregó', needsReason: true }];
    default:
      return [];
  }
}
