import { render, screen, within } from '@testing-library/react';
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

  describe('tamaño grande', () => {
    it('entrega: escribe la etiqueta de cada hito y marca el actual como paso', () => {
      render(<DeliveryProgress status="EN_CAMINO" type="ENTREGA" size="lg" />);

      const steps = within(screen.getByRole('list', { name: 'Progreso del pedido' })).getAllByRole('listitem');
      expect(steps.map((step) => step.textContent)).toEqual(['Pendiente', 'Confirmado', 'Preparando', 'En camino', 'Entregado']);
      expect(steps[3]).toHaveAttribute('aria-current', 'step');
      expect(steps.filter((step) => step.hasAttribute('aria-current'))).toHaveLength(1);
      expect(reached()).toBe(4);
    });

    it('recojo termina en "Recogido" y pasa por "Listo para recoger"', () => {
      render(<DeliveryProgress status="LISTO_PARA_RECOGER" type="RECOJO" size="lg" />);

      const steps = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(steps.map((step) => step.textContent)).toEqual(['Pendiente', 'Confirmado', 'Preparando', 'Listo para recoger', 'Recogido']);
      expect(reached()).toBe(4);
    });

    it('LISTO_PARA_ENVIO se ve como "Preparando"', () => {
      render(<DeliveryProgress status="LISTO_PARA_ENVIO" type="ENTREGA" size="lg" />);

      expect(screen.getAllByText('Preparando')).toHaveLength(2);
      expect(reached()).toBe(3);
    });
  });
});
