import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyOrdersPage } from '@/features/perfil/my-orders-page';
import * as orderApi from '@/features/perfil/order-api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/order-api');

function order(id: number, name = `Plato ${id}`): orderApi.OrderSummary {
  return {
    id,
    code: `SAL-00${id}`,
    itemNames: [name],
    total: 30,
    purchasedAt: '2026-11-07T14:00:00Z',
    deliveryStatus: 'EN_PREPARACION',
  };
}

function page(items: orderApi.OrderSummary[], current = 1, totalPages = 1) {
  return { items, page: current, pageSize: 10, totalItems: items.length, totalPages };
}

function Location() {
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

function renderPage(path = '/perfil/mis-pedidos') {
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[path]}>
        <MyOrdersPage />
        <Location />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

describe('MyOrdersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra un estado de carga', () => {
    vi.mocked(orderApi.listMyOrders).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText(/Cargando tus pedidos/)).toBeInTheDocument();
  });

  it('si falla, avisa y "Reintentar" vuelve a cargar', async () => {
    vi.mocked(orderApi.listMyOrders).mockRejectedValueOnce(new Error('network')).mockResolvedValue(page([order(1)]));
    renderPage();

    expect(await screen.findByText('No pudimos cargar tus pedidos.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Plato 1')).toBeInTheDocument();
  });

  it('sin pedidos muestra el estado vacío con enlace a la carta', async () => {
    vi.mocked(orderApi.listMyOrders).mockResolvedValue(page([], 1, 0));
    renderPage();

    expect(await screen.findByText('Aún no tienes pedidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la carta' })).toHaveAttribute('href', '/menu');
  });

  it('muestra una tarjeta por pedido y sin paginación si hay una sola página', async () => {
    vi.mocked(orderApi.listMyOrders).mockResolvedValue(page([order(1), order(2)]));
    renderPage();

    expect(await screen.findByText('Plato 1')).toBeInTheDocument();
    expect(screen.getByText('Plato 2')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('pide la página de la URL y al paginar la actualiza', async () => {
    vi.mocked(orderApi.listMyOrders).mockImplementation(async (requested) =>
      page([order(requested)], requested, 3),
    );
    const user = userEvent.setup();
    renderPage('/perfil/mis-pedidos?page=2');

    expect(await screen.findByText('Plato 2')).toBeInTheDocument();
    expect(orderApi.listMyOrders).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Página 3' }));

    expect(await screen.findByText('Plato 3')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?page=3');
  });

  it('si el servidor devuelve otra página que la pedida, corrige la URL', async () => {
    vi.mocked(orderApi.listMyOrders).mockResolvedValue(page([order(9)], 2, 2));
    renderPage('/perfil/mis-pedidos?page=9');

    expect(await screen.findByText('Plato 9')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?page=2');
  });

  it('una página inválida en la URL se trata como la primera', async () => {
    vi.mocked(orderApi.listMyOrders).mockResolvedValue(page([order(1)]));
    renderPage('/perfil/mis-pedidos?page=abc');

    await screen.findByText('Plato 1');
    expect(orderApi.listMyOrders).toHaveBeenCalledWith(1);
  });
});
