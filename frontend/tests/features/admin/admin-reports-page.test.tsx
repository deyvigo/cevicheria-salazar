import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as reportApi from '@/features/admin/admin-report-api';
import { AdminReportsPage } from '@/features/admin/admin-reports-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-report-api');

const report: reportApi.SalesReport = {
  granularity: 'DAY',
  summary: {
    revenue: 120,
    orders: 3,
    averageTicket: 40,
    discounts: 5,
    pendingCollection: 25,
    pendingRefunds: { count: 2, amount: 60 },
  },
  series: [
    { date: '2026-11-01', revenue: 120, orders: 3 },
    { date: '2026-11-02', revenue: 0, orders: 0 },
  ],
  byPayment: [
    { method: 'ONLINE', orders: 2, revenue: 80, percentage: 66.7 },
    { method: 'EFECTIVO', orders: 1, revenue: 40, percentage: 33.3 },
    { method: 'YAPE', orders: 0, revenue: 0, percentage: 0 },
  ],
  topDishes: [{ name: 'Ceviche clásico', units: 5, revenue: 150 }],
};

const empty: reportApi.SalesReport = {
  granularity: 'DAY',
  summary: {
    revenue: 0,
    orders: 0,
    averageTicket: 0,
    discounts: 0,
    pendingCollection: 0,
    pendingRefunds: { count: 0, amount: 0 },
  },
  series: [{ date: '2026-11-01', revenue: 0, orders: 0 }],
  byPayment: [
    { method: 'ONLINE', orders: 0, revenue: 0, percentage: 0 },
    { method: 'EFECTIVO', orders: 0, revenue: 0, percentage: 0 },
    { method: 'YAPE', orders: 0, revenue: 0, percentage: 0 },
  ],
  topDishes: [],
};

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage(url = '/admin/reportes') {
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[url]}>
        <AdminReportsPage />
        <Location />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

async function loaded() {
  await screen.findByRole('img', { name: /Ventas por día/ });
}

function lastQuery() {
  return vi.mocked(reportApi.getSalesReport).mock.calls.at(-1)![0];
}

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(reportApi.getSalesReport).mockResolvedValue(report);
  });

  it('carga el reporte de los últimos 7 días y muestra tarjetas, gráficas y ranking', async () => {
    renderPage();

    expect(screen.getByText('Cargando el reporte...')).toBeInTheDocument();
    await loaded();
    const query = lastQuery();
    expect(query.payment).toBeUndefined();
    expect(query.type).toBeUndefined();
    const days = (Date.parse(query.to) - Date.parse(query.from)) / 86_400_000 + 1;
    expect(days).toBe(7);

    expect(screen.getByText('Ticket promedio').nextSibling).toHaveTextContent('S/ 40.00');
    expect(screen.getByText('Por cobrar').nextSibling).toHaveTextContent('S/ 25.00');
    expect(screen.getByText('Reembolsos pendientes').nextSibling).toHaveTextContent('S/ 60.00');
    expect(screen.getByRole('img', { name: /Ventas por día/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'S/ 80.00' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Ceviche clásico' })).toBeInTheDocument();
  });

  it('un periodo sin ventas muestra ceros y el aviso en las tres secciones', async () => {
    vi.mocked(reportApi.getSalesReport).mockResolvedValue(empty);
    renderPage();

    await waitFor(() => expect(screen.getAllByText('No hay ventas en este periodo')).toHaveLength(3));
    expect(screen.getByText('Ingresos').nextSibling).toHaveTextContent('S/ 0.00');
  });

  it('si falla, ofrece Reintentar', async () => {
    vi.mocked(reportApi.getSalesReport).mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(await screen.findByText('No pudimos cargar el reporte.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await loaded();
  });

  it('los filtros recalculan el reporte y quedan en la URL', async () => {
    renderPage();
    await loaded();

    await userEvent.selectOptions(screen.getByLabelText('Pago'), 'YAPE');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'ENTREGA');
    await userEvent.selectOptions(screen.getByLabelText('Periodo'), 'month');

    await waitFor(() => expect(lastQuery()).toMatchObject({ payment: 'YAPE', type: 'ENTREGA' }));
    expect(screen.getByTestId('location')).toHaveTextContent('range=month');
    expect(screen.getByTestId('location')).toHaveTextContent('payment=YAPE');

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/reportes$/);
  });

  it('un rango personalizado inválido muestra el error y no pide el reporte', async () => {
    renderPage('/admin/reportes?range=custom&from=2026-11-01&to=2026-11-05');
    await loaded();
    const calls = vi.mocked(reportApi.getSalesReport).mock.calls.length;

    await userEvent.clear(screen.getByLabelText('Desde'));
    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-09');

    expect(await screen.findByText('La fecha inicial no puede ser posterior a la final')).toBeInTheDocument();
    expect(vi.mocked(reportApi.getSalesReport)).toHaveBeenCalledTimes(calls);
    expect(lastQuery()).toMatchObject({ from: '2026-11-01', to: '2026-11-05' });
  });

  it('con un rango personalizado incompleto pide elegir las fechas', async () => {
    renderPage('/admin/reportes?range=custom');

    expect(screen.getByText('Elige las fechas del periodo.')).toBeInTheDocument();
    expect(reportApi.getSalesReport).not.toHaveBeenCalled();
  });

  it('Actualizar vuelve a pedir el reporte', async () => {
    renderPage();
    await loaded();
    const calls = vi.mocked(reportApi.getSalesReport).mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => expect(vi.mocked(reportApi.getSalesReport).mock.calls.length).toBeGreaterThan(calls));
  });
});
