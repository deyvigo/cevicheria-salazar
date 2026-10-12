import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderSummary } from '@/features/carrito/components/order-summary';

describe('OrderSummary', () => {
  it('muestra subtotal, descuento, delivery y total en ese orden', () => {
    render(<OrderSummary summary={{ subtotal: 82.5, discount: 0, delivery: 5, total: 87.5 }} />);

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    const terms = within(region)
      .getAllByRole('term')
      .map((el) => el.textContent);
    const values = within(region)
      .getAllByRole('definition')
      .map((el) => el.textContent);

    expect(terms).toEqual(['Subtotal', 'Descuento', 'Delivery', 'Total']);
    expect(values).toEqual(['S/ 82.50', 'S/ 0.00', 'S/ 5.00', 'S/ 87.50']);
  });

  it('no muestra montos mientras faltan precios', () => {
    render(<OrderSummary summary={null} />);

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).queryByText(/S\//)).not.toBeInTheDocument();
  });
});
