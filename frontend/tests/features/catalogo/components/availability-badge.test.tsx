import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvailabilityBadge } from '@/features/catalogo/components/availability-badge';

describe('AvailabilityBadge', () => {
  it('muestra "Disponible" con los colores de éxito', () => {
    render(<AvailabilityBadge available />);

    const badge = screen.getByText('Disponible');
    expect(badge).toHaveClass('bg-success-surface', 'text-success-text');
  });

  it('muestra "Agotado" con los colores de error', () => {
    render(<AvailabilityBadge available={false} />);

    const badge = screen.getByText('Agotado');
    expect(badge).toHaveClass('bg-error-surface', 'text-error-text');
  });

  it('no renderiza nada cuando la disponibilidad no está confirmada', () => {
    const { container } = render(<AvailabilityBadge available={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('marca el punto como decorativo', () => {
    const { container } = render(<AvailabilityBadge available />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
