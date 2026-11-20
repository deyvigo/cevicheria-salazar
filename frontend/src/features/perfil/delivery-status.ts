import type { DeliveryStatus, OrderDeliveryType } from '@/features/perfil/order-api';

export interface Milestone {
  status: DeliveryStatus;
  label: string;
}

// The customer follows five milestones; LISTO_PARA_ENVIO is kitchen-only and reads as still preparing
export function milestonesFor(type: OrderDeliveryType): Milestone[] {
  return [
    { status: 'PENDIENTE', label: 'Pendiente' },
    { status: 'CONFIRMADO', label: 'Confirmado' },
    { status: 'EN_PREPARACION', label: 'Preparando' },
    type === 'RECOJO'
      ? { status: 'LISTO_PARA_RECOGER', label: 'Listo para recoger' }
      : { status: 'EN_CAMINO', label: 'En camino' },
    { status: 'ENTREGADO', label: type === 'RECOJO' ? 'Recogido' : 'Entregado' },
  ];
}

export function milestoneIndex(status: DeliveryStatus, type: OrderDeliveryType): number {
  const effective = status === 'LISTO_PARA_ENVIO' ? 'EN_PREPARACION' : status;
  return Math.max(
    milestonesFor(type).findIndex((milestone) => milestone.status === effective),
    0,
  );
}

export function isNegativeStatus(status: DeliveryStatus): boolean {
  return status === 'RECHAZADO' || status === 'CANCELADO' || status === 'FALLIDO';
}

export function customerMessage(status: DeliveryStatus, type: OrderDeliveryType): string {
  switch (status) {
    case 'PENDIENTE':
      return 'Recibimos tu pedido, esperando confirmación';
    case 'CONFIRMADO':
      return 'El restaurante aceptó tu pedido';
    case 'EN_PREPARACION':
    case 'LISTO_PARA_ENVIO':
      return 'Estamos preparando tu pedido';
    case 'LISTO_PARA_RECOGER':
      return 'Tu pedido está listo, puedes pasar a recogerlo';
    case 'EN_CAMINO':
      return 'Tu pedido va en camino';
    case 'ENTREGADO':
      return type === 'RECOJO' ? 'Pedido recogido, ¡buen provecho!' : 'Pedido entregado, ¡buen provecho!';
    case 'RECHAZADO':
      return 'No pudimos aceptar tu pedido';
    case 'CANCELADO':
      return 'Tu pedido fue cancelado';
    case 'FALLIDO':
      return 'No pudimos entregarte el pedido';
  }
}

export function deliveryStatusLabel(status: DeliveryStatus, type: OrderDeliveryType = 'ENTREGA'): string {
  if (isNegativeStatus(status)) {
    return { RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado', FALLIDO: 'No entregado' }[status as 'RECHAZADO'];
  }
  return milestonesFor(type)[milestoneIndex(status, type)].label;
}
