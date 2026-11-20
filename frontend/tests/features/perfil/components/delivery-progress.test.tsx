import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeliveryProgress } from '@/features/perfil/components/delivery-progress';

function reached() {
  return screen.getAllByTestId('delivery-dot').filter((dot) => dot.dataset.reached === 'true').length;
}

describe('DeliveryProgress', () => {
  it.each([
    ['PENDIENTE', 'Pendiente', 1],
    ['CONFIRMADO', 'Confirmado', 2],
    ['EN_PREPARACION', 'Preparando', 3],
    ['LISTO_PARA_ENVIO', 'Preparando', 3],
    ['EN_CAMINO', 'En camino', 4],
    ['ENTREGADO', 'Entregado', 5],
  ] as const)('entrega: %s muestra "%s" y marca %i punto(s)', (status, label, dots) => {
    render(<DeliveryProgress status={status} type="ENTREGA" />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getAllByTestId('delivery-dot')).toHaveLength(5);
    expect(reached()).toBe(dots);
  });

  it.each([
    ['LISTO_PARA_RECOGER', 'Listo para recoger', 4],
    ['ENTREGADO', 'Recogido', 5],
  ] as const)('recojo: %s muestra "%s" y marca %i punto(s)', (status, label, dots) => {
    render(<DeliveryProgress status={status} type="RECOJO" />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(reached()).toBe(dots);
  });
});
