import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderSummary } from '@/features/carrito/components/order-summary';

describe('OrderSummary', () => {
  it('muestra subtotal, descuento y total en ese orden', () => {
    render(<OrderSummary summary={{ subtotal: 82.5, discount: 0, total: 82.5 }} />);

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    const terms = within(region)
      .getAllByRole('term')
      .map((el) => el.textContent);
    const values = within(region)
      .getAllByRole('definition')
      .map((el) => el.textContent);

    expect(terms).toEqual(['Subtotal', 'Descuento', 'Total']);
    expect(values).toEqual(['S/ 82.50', 'S/ 0.00', 'S/ 82.50']);
  });

  it('no muestra montos mientras faltan precios', () => {
    render(<OrderSummary summary={null} />);

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).queryByText(/S\//)).not.toBeInTheDocument();
  });

  it('con delivery agrega la fila y lo suma al total', () => {
    render(<OrderSummary summary={{ subtotal: 82.5, discount: 0, total: 82.5 }} delivery={8.5} />);

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    const terms = within(region)
      .getAllByRole('term')
      .map((el) => el.textContent);
    const values = within(region)
      .getAllByRole('definition')
      .map((el) => el.textContent);

    expect(terms).toEqual(['Subtotal', 'Descuento', 'Delivery', 'Total']);
    expect(values).toEqual(['S/ 82.50', 'S/ 0.00', 'S/ 8.50', 'S/ 91.00']);
  });

  it('mientras carga el delivery no muestra delivery ni total', () => {
    render(<OrderSummary summary={{ subtotal: 82.5, discount: 0, total: 82.5 }} delivery="loading" />);

    const region = screen.getByRole('region', { name: 'Resumen del pedido' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).queryByText('Delivery')).not.toBeInTheDocument();
    expect(within(region).queryByText('Total')).not.toBeInTheDocument();
  });

  it('muestra los hijos al pie', () => {
    render(
      <OrderSummary summary={null}>
        <button>Seguir</button>
      </OrderSummary>,
    );

    expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
  });
});
