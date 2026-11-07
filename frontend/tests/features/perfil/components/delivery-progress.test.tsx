import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeliveryProgress } from '@/features/perfil/components/delivery-progress';

function reached() {
  return screen.getAllByTestId('delivery-dot').filter((dot) => dot.dataset.reached === 'true').length;
}

describe('DeliveryProgress', () => {
  it.each([
    ['EN_PREPARACION', 'En preparación', 1],
    ['EN_CAMINO', 'En camino', 2],
    ['ENTREGADO', 'Entregado', 3],
  ] as const)('%s marca %i punto(s) y muestra el texto', (status, label, dots) => {
    render(<DeliveryProgress status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getAllByTestId('delivery-dot')).toHaveLength(3);
    expect(reached()).toBe(dots);
  });
});
