import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PaymentDonut } from '@/features/admin/components/payment-donut';
import { SalesBarChart } from '@/features/admin/components/sales-bar-chart';
import type { PaymentShare, SalesPeriod } from '@/features/admin/admin-report-api';

const periods: SalesPeriod[] = [
  { date: '2026-11-01', revenue: 30, orders: 2 },
  { date: '2026-11-02', revenue: 0, orders: 0 },
  { date: '2026-11-03', revenue: 90, orders: 1 },
];

const shares: PaymentShare[] = [
  { method: 'ONLINE', orders: 3, revenue: 60, percentage: 50 },
  { method: 'EFECTIVO', orders: 1, revenue: 36, percentage: 30 },
  { method: 'YAPE', orders: 0, revenue: 0, percentage: 0 },
];

describe('SalesBarChart', () => {
  it('dibuja una barra por periodo, incluidos los días sin ventas, y los lista en una tabla accesible', () => {
    const { container } = render(<SalesBarChart periods={periods} granularity="DAY" from="2026-11-01" to="2026-11-03" />);

    expect(screen.getByRole('img', { name: /Ventas por día: 3 periodos/ })).toBeInTheDocument();
    expect(container.querySelectorAll('rect.fill-action')).toHaveLength(3);
    const rows = within(screen.getByRole('table', { hidden: true })).getAllByRole('row', { hidden: true });
    expect(rows).toHaveLength(4);
    expect(rows[2]).toHaveTextContent('S/ 0.00');
  });

  it('muestra el detalle de una barra con el cursor', async () => {
    const { container } = render(<SalesBarChart periods={periods} granularity="DAY" from="2026-11-01" to="2026-11-03" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Del 1 de noviembre de 2026 al 3 de noviembre de 2026: S/ 120.00 · 3 pedidos',
    );

    await userEvent.hover(container.querySelectorAll('rect.fill-transparent')[2]);

    expect(screen.getByRole('status')).toHaveTextContent('3 de noviembre de 2026: S/ 90.00 · 1 pedido');
  });

  it('nombra los periodos semanales y mensuales', () => {
    const { rerender } = render(<SalesBarChart periods={[periods[0]]} granularity="WEEK" from="2026-11-01" to="2026-11-07" />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/por semana/);
    expect(screen.getByRole('rowheader', { hidden: true })).toHaveTextContent('Semana del 1 de noviembre de 2026');

    rerender(<SalesBarChart periods={[periods[0]]} granularity="MONTH" from="2026-11-01" to="2026-11-07" />);
    expect(screen.getByRole('rowheader', { hidden: true })).toHaveTextContent('nov 2026');
  });
});

describe('PaymentDonut', () => {
  it('la tabla coincide con los datos y muestra el total en el centro', () => {
    render(<PaymentDonut shares={shares} />);

    expect(screen.getByText('S/ 96.00')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('Online3S/ 60.0050.0%');
    expect(rows[3]).toHaveTextContent('Yape0S/ 0.000.0%');
  });

  it('dibuja solo los segmentos con ventas y muestra su detalle con el cursor', async () => {
    const { container } = render(<PaymentDonut shares={shares} />);
    const segments = container.querySelectorAll('circle.stroke-celeste-700, circle.stroke-naranja-500, circle.stroke-lima-800');

    expect(segments).toHaveLength(2);
    await userEvent.hover(segments[1]);
    expect(screen.getByRole('status')).toHaveTextContent('EfectivoS/ 36.001 pedido · 30.0%');
  });
});
