import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as orderApi from '@/features/admin/admin-order-api';
import { AdminOrdersLiveProvider } from '@/features/admin/admin-orders-live';
import { AdminOrdersPage } from '@/features/admin/admin-orders-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-order-api');
vi.mock('@/lib/api', () => ({ api: { get: vi.fn().mockResolvedValue({ data: [] }) } }));

class FakeEventSource {
  static CLOSED = 2;
  static instances: FakeEventSource[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((event: { data: string }) => void)[]> = {};

  url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    (this.listeners[type] ??= []).push(listener);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(type: string, orderId: number) {
    this.listeners[type]?.forEach((listener) => listener({ data: JSON.stringify({ orderId }) }));
  }
}

const preparing: orderApi.AdminOrderRow = {
  id: 1,
  code: 'SAL-001042',
  purchasedAt: '2026-11-07T19:32:00Z',
  customerName: 'María Quispe',
  deliveryType: 'ENTREGA',
  zoneName: 'Barranco',
  paymentMethod: 'CONTRAENTREGA',
  collectionMethod: 'EFECTIVO',
  paymentStatus: 'PENDIENTE_COBRO',
  total: 92,
  cashChange: 8,
  deliveryStatus: 'EN_PREPARACION',
};
const onTheWay: orderApi.AdminOrderRow = {
  ...preparing,
  id: 2,
  code: 'SAL-001043',
  customerName: 'José Ñañez',
  deliveryType: 'RECOJO',
  zoneName: null,
  paymentMethod: 'ONLINE',
  collectionMethod: null,
  paymentStatus: 'PAGADO',
  cashChange: null,
  total: 30,
  deliveryStatus: 'EN_CAMINO',
};

function pageOf(items: orderApi.AdminOrderRow[], page = 1, totalPages = 1) {
  return { items, page, pageSize: 20, totalItems: items.length, totalPages };
}

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage(url = '/admin/pedidos') {
  render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[url]}>
        <AdminOrdersLiveProvider>
          <AdminOrdersPage />
        </AdminOrdersLiveProvider>
        <Location />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

function lastQuery() {
  return vi.mocked(orderApi.listAdminOrders).mock.calls.at(-1)![0];
}

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.mocked(orderApi.listAdminOrderZones).mockResolvedValue(['Barranco', 'Miraflores']);
    vi.mocked(orderApi.adminOrderEventsUrl).mockReturnValue('http://api/admin/orders/events');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra un estado de carga y luego las filas con lo esencial de cada pedido', async () => {
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing, onTheWay]));
    renderPage();

    expect(screen.getByText(/Cargando los pedidos/)).toBeInTheDocument();

    const row = (await screen.findByText('María Quispe')).closest('tr')!;
    expect(within(row).getByText('SAL-001042')).toBeInTheDocument();
    expect(within(row).getByText('Entrega')).toBeInTheDocument();
    expect(within(row).getByText('Barranco')).toBeInTheDocument();
    expect(within(row).getByText('Efectivo')).toBeInTheDocument();
    expect(within(row).getByText('Vuelto S/ 8.00')).toBeInTheDocument();
    expect(within(row).getByText('Por cobrar')).toBeInTheDocument();
    expect(within(row).getByText('S/ 92.00')).toBeInTheDocument();
    expect(within(row).getByText('En preparación')).toBeInTheDocument();
    expect(screen.getByText('2 pedidos')).toBeInTheDocument();
    const pickup = screen.getByText('José Ñañez').closest('tr')!;
    expect(within(pickup).getByText('Online')).toBeInTheDocument();
    expect(within(pickup).getByText('—')).toBeInTheDocument();
  });

  it('por defecto pide la fecha de compra descendente y solo los pedidos activos', async () => {
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
    renderPage();
    await screen.findByText('María Quispe');

    expect(lastQuery()).toMatchObject({ page: 1, sort: 'date', dir: 'desc', deliveryStatus: 'ACTIVE' });
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/pedidos$/);
    expect(screen.getByRole('columnheader', { name: /Fecha/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('muestra un error con opción de reintentar', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.listAdminOrders).mockRejectedValueOnce(new Error('boom')).mockResolvedValue(pageOf([preparing]));
    renderPage();

    expect(await screen.findByText('No pudimos cargar los pedidos.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('María Quispe')).toBeInTheDocument();
  });

  it('distingue el estado vacío por defecto del de los filtros', async () => {
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([]));
    renderPage();
    expect(await screen.findByText('No hay pedidos activos')).toBeInTheDocument();
  });

  it('con filtros sin resultados lo dice y permite limpiarlos', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([]));
    renderPage('/admin/pedidos?type=RECOJO&stage=ALL');

    expect(await screen.findByText('No hay pedidos con estos filtros')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/pedidos$/));
    expect(await screen.findByText('No hay pedidos activos')).toBeInTheDocument();
  });

  it('solo las columnas con sentido se ordenan; un segundo clic invierte la dirección', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
    renderPage('/admin/pedidos?page=3');
    await screen.findByText('María Quispe');

    for (const name of ['Tipo', 'Pago', 'Estado de pago', 'Acción']) {
      expect(within(screen.getByRole('columnheader', { name })).queryByRole('button')).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Total' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/pedidos?sort=total&dir=asc');
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 1, sort: 'total', dir: 'asc' }));

    await user.click(screen.getByRole('button', { name: 'Total' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/pedidos?sort=total');
    expect(screen.getByTestId('location')).not.toHaveTextContent('dir=');
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('cada filtro llega al servidor y vuelve a la primera página', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
    renderPage('/admin/pedidos?page=2');
    await screen.findByText('María Quispe');

    await user.selectOptions(screen.getByLabelText('Estado de entrega'), 'Todos');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Recojo');
    await user.selectOptions(screen.getByLabelText('Pago'), 'Yape');
    await user.selectOptions(screen.getByLabelText('Estado de pago'), 'Por cobrar');
    await user.selectOptions(screen.getByLabelText('Zona'), 'Barranco');

    await waitFor(() =>
      expect(lastQuery()).toMatchObject({
        page: 1,
        deliveryStatus: 'ALL',
        type: 'RECOJO',
        payment: 'YAPE',
        paymentStatus: 'PENDIENTE_COBRO',
        zone: 'Barranco',
      }),
    );
  });

  it('la búsqueda espera una pausa al escribir', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
    renderPage();
    await screen.findByText('María Quispe');

    await user.type(screen.getByRole('searchbox', { name: 'Buscar pedidos' }), 'maria');

    await waitFor(() => expect(lastQuery()).toMatchObject({ q: 'maria', page: 1 }));
    const searches = vi.mocked(orderApi.listAdminOrders).mock.calls.filter(([params]) => params.q !== undefined);
    expect(searches).toHaveLength(1);
  });

  it('el rango personalizado envía desde y hasta, y no aplica uno invertido', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
    renderPage();
    await screen.findByText('María Quispe');

    await user.selectOptions(screen.getByLabelText('Fecha'), 'Personalizado');
    await user.type(screen.getByLabelText('Desde'), '2026-11-01');
    await user.type(screen.getByLabelText('Hasta'), '2026-11-05');
    await waitFor(() => expect(lastQuery()).toMatchObject({ from: '2026-11-01', to: '2026-11-05' }));

    await user.clear(screen.getByLabelText('Desde'));
    await user.type(screen.getByLabelText('Desde'), '2026-11-09');
    expect(await screen.findByText('Debe ser anterior a la fecha final')).toBeInTheDocument();
    expect(lastQuery()).toMatchObject({ to: '2026-11-05' });
    expect(lastQuery().from).not.toBe('2026-11-09');
  });

  it('pasa a la última página si la pedida ya no existe', async () => {
    vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing], 2, 2));
    renderPage('/admin/pedidos?page=9');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=2'));
  });

  describe('cambiar el estado', () => {
    it('marcar en camino avanza el pedido sin pedir confirmación', async () => {
      const user = userEvent.setup();
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      vi.mocked(orderApi.advanceAdminOrder).mockResolvedValue({ ...preparing, deliveryStatus: 'EN_CAMINO' });
      renderPage();
      await screen.findByText('María Quispe');

      await user.click(screen.getByRole('button', { name: 'Marcar en camino' }));

      expect(orderApi.advanceAdminOrder).toHaveBeenCalledWith(1, 'EN_PREPARACION');
      const row = screen.getByText('María Quispe').closest('tr')!;
      expect(await within(row).findByText('En camino')).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'Marcar entregado' })).toBeInTheDocument();
    });

    it('marcar entregado pide confirmación y se puede cancelar', async () => {
      const user = userEvent.setup();
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([onTheWay]));
      vi.mocked(orderApi.advanceAdminOrder).mockResolvedValue({ ...onTheWay, deliveryStatus: 'ENTREGADO' });
      renderPage();
      await screen.findByText('José Ñañez');

      await user.click(screen.getByRole('button', { name: 'Marcar entregado' }));
      const dialog = screen.getByRole('dialog', { name: 'Marcar como entregado' });
      expect(within(dialog).getByText(/SAL-001043/)).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(orderApi.advanceAdminOrder).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Marcar entregado' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Marcar entregado' }));

      expect(orderApi.advanceAdminOrder).toHaveBeenCalledWith(2, 'EN_CAMINO');
      const row = screen.getByText('José Ñañez').closest('tr')!;
      expect(await within(row).findByText('Entregado')).toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: /Marcar/ })).not.toBeInTheDocument();
    });

    it('si otro administrador ya lo movió avisa y refresca', async () => {
      const user = userEvent.setup();
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      vi.mocked(orderApi.advanceAdminOrder).mockRejectedValue(
        new AxiosError('conflict', '409', undefined, undefined, { status: 409 } as never),
      );
      renderPage();
      await screen.findByText('María Quispe');

      await user.click(screen.getByRole('button', { name: 'Marcar en camino' }));

      expect(await screen.findByText('El pedido ya había cambiado de estado')).toBeInTheDocument();
      await waitFor(() => expect(vi.mocked(orderApi.listAdminOrders).mock.calls.length).toBeGreaterThan(1));
    });

    it('un error cualquiera deja la fila como estaba y lo dice', async () => {
      const user = userEvent.setup();
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      vi.mocked(orderApi.advanceAdminOrder).mockRejectedValue(new Error('network'));
      renderPage();
      await screen.findByText('María Quispe');

      await user.click(screen.getByRole('button', { name: 'Marcar en camino' }));

      expect(await screen.findByText('No pudimos actualizar el pedido, intenta de nuevo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Marcar en camino' })).toBeEnabled();
    });
  });

  describe('detalle', () => {
    const detail: orderApi.AdminOrderDetail = {
      order: preparing,
      customerPhone: '987654321',
      addressText: 'Av. Arequipa 123',
      addressReference: 'Puerta verde',
      items: [{ name: 'Ceviche clásico', quantity: 2, unitPrice: 30, lineTotal: 60 }],
      subtotal: 60,
      discount: 0,
      deliveryPrice: 8.5,
      cashAmount: 100,
    };

    it('se abre al hacer clic en el código y muestra al cliente, la dirección y los platos', async () => {
      const user = userEvent.setup();
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      vi.mocked(orderApi.getAdminOrder).mockResolvedValue(detail);
      renderPage();
      await screen.findByText('María Quispe');

      await user.click(screen.getByRole('button', { name: 'Ver detalle del pedido SAL-001042' }));

      const dialog = await screen.findByRole('dialog', { name: 'Pedido SAL-001042' });
      expect(await within(dialog).findByText('987654321')).toBeInTheDocument();
      expect(within(dialog).getByText('Av. Arequipa 123')).toBeInTheDocument();
      expect(within(dialog).getByText('Puerta verde')).toBeInTheDocument();
      expect(within(dialog).getByText('2 × Ceviche clásico')).toBeInTheDocument();
      expect(within(dialog).getByText('S/ 100.00')).toBeInTheDocument();
      expect(within(dialog).queryByText(/código de entrega/i)).not.toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Marcar en camino' })).toBeInTheDocument();
    });
  });

  describe('tiempo real', () => {
    function stream() {
      return FakeEventSource.instances.at(-1)!;
    }

    it('abre la conexión con credenciales y refresca la tabla cuando entra un pedido en la vista por defecto', async () => {
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      renderPage();
      await screen.findByText('María Quispe');
      expect(stream().url).toBe('http://api/admin/orders/events');
      const before = vi.mocked(orderApi.listAdminOrders).mock.calls.length;

      act(() => stream().emit('pedido-creado', 99));

      await waitFor(() => expect(vi.mocked(orderApi.listAdminOrders).mock.calls.length).toBeGreaterThan(before));
    });

    it('en otra página no mueve la tabla: avisa cuántos pedidos nuevos hay y permite volver al orden por defecto', async () => {
      const user = userEvent.setup();
      vi.mocked(orderApi.listAdminOrders).mockImplementation(async (params) =>
        pageOf(params.sort === 'date' && params.dir === 'desc' ? [{ ...preparing, id: 99, code: 'SAL-001099' }] : [preparing], params.page, 3),
      );
      renderPage('/admin/pedidos?sort=total&dir=asc');
      await screen.findByText('María Quispe');
      const before = vi.mocked(orderApi.listAdminOrders).mock.calls.length;

      act(() => stream().emit('pedido-creado', 99));

      expect(await screen.findByText('1 pedido nuevo')).toBeInTheDocument();
      // The check for the new order is the only extra request; the visible rows are untouched
      expect(vi.mocked(orderApi.listAdminOrders).mock.calls.length).toBe(before + 1);
      expect(screen.getByText('María Quispe')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Ver pedidos nuevos' }));

      await waitFor(() => expect(screen.getByTestId('location')).not.toHaveTextContent('sort='));
      await waitFor(() => expect(screen.queryByText('1 pedido nuevo')).not.toBeInTheDocument());
    });

    it('un pedido nuevo que no cumple los filtros no cuenta como nuevo', async () => {
      vi.mocked(orderApi.listAdminOrders).mockImplementation(async (params) =>
        pageOf(params.sort === 'date' && params.dir === 'desc' ? [preparing] : [onTheWay], params.page, 3),
      );
      renderPage('/admin/pedidos?sort=total');
      await screen.findByText('José Ñañez');

      act(() => stream().emit('pedido-creado', 99));

      await waitFor(() => expect(vi.mocked(orderApi.listAdminOrders).mock.calls.length).toBeGreaterThan(1));
      expect(screen.queryByText(/pedidos? nuevos?/)).not.toBeInTheDocument();
    });

    it('un cambio de estado actualiza la fila en su lugar sin mover la lista', async () => {
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      vi.mocked(orderApi.getAdminOrder).mockResolvedValue({
        order: { ...preparing, deliveryStatus: 'ENTREGADO' },
        customerPhone: '1',
        addressText: null,
        addressReference: null,
        items: [],
        subtotal: 0,
        discount: 0,
        deliveryPrice: 0,
        cashAmount: null,
      });
      renderPage();
      const row = (await screen.findByText('María Quispe')).closest('tr')!;
      const before = vi.mocked(orderApi.listAdminOrders).mock.calls.length;

      act(() => stream().emit('pedido-actualizado', 1));

      expect(await within(row).findByText('Entregado')).toBeInTheDocument();
      expect(vi.mocked(orderApi.listAdminOrders).mock.calls.length).toBe(before);
    });

    it('resalta los pedidos que llegan en vivo con un borde y la etiqueta Nuevo, hasta que el administrador los abre', async () => {
      const user = userEvent.setup();
      const fresh = { ...preparing, id: 50, code: 'SAL-001050', customerName: 'Rosa Pérez' };
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      vi.mocked(orderApi.getAdminOrder).mockResolvedValue({
        order: fresh,
        customerPhone: '1',
        addressText: null,
        addressReference: null,
        items: [],
        subtotal: 0,
        discount: 0,
        deliveryPrice: 0,
        cashAmount: null,
      });
      renderPage();
      await screen.findByText('María Quispe');
      expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();

      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([fresh, preparing]));
      act(() => stream().emit('pedido-creado', 50));

      const row = (await screen.findByText('Rosa Pérez')).closest('tr')!;
      expect(within(row).getByText('Nuevo')).toBeInTheDocument();
      expect(row).toHaveClass('bg-surface-naranja');
      expect(screen.getByText('1 pedido nuevo sin revisar')).toBeInTheDocument();
      const old = screen.getByText('María Quispe').closest('tr')!;
      expect(within(old).queryByText('Nuevo')).not.toBeInTheDocument();

      await user.click(within(row).getByRole('button', { name: 'Ver detalle del pedido SAL-001050' }));

      await waitFor(() => expect(within(row).queryByText('Nuevo')).not.toBeInTheDocument());
      expect(screen.queryByText(/sin revisar/)).not.toBeInTheDocument();
    });

    it('marcar como vistos quita el resalte de todos', async () => {
      const user = userEvent.setup();
      const a = { ...preparing, id: 50, code: 'SAL-001050', customerName: 'Rosa Pérez' };
      const b = { ...preparing, id: 51, code: 'SAL-001051', customerName: 'Luis Soto' };
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([a, b]));
      renderPage();
      await screen.findByText('Rosa Pérez');

      act(() => {
        stream().emit('pedido-creado', 50);
        stream().emit('pedido-creado', 51);
      });
      expect(await screen.findByText('2 pedidos nuevos sin revisar')).toBeInTheDocument();
      expect(screen.getAllByText('Nuevo')).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: 'Marcar como vistos' }));

      expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
      expect(screen.queryByText(/sin revisar/)).not.toBeInTheDocument();
    });

    it('avanzar el estado de un pedido nuevo también lo da por visto', async () => {
      const user = userEvent.setup();
      const fresh = { ...preparing, id: 50, code: 'SAL-001050', customerName: 'Rosa Pérez' };
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([fresh]));
      vi.mocked(orderApi.advanceAdminOrder).mockResolvedValue({ ...fresh, deliveryStatus: 'EN_CAMINO' });
      renderPage();
      await screen.findByText('Rosa Pérez');
      act(() => stream().emit('pedido-creado', 50));
      expect(await screen.findByText('Nuevo')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Marcar en camino' }));

      await waitFor(() => expect(screen.queryByText('Nuevo')).not.toBeInTheDocument());
    });

    it('si la conexión se corta lo indica, y al volver refresca la lista', async () => {
      vi.mocked(orderApi.listAdminOrders).mockResolvedValue(pageOf([preparing]));
      renderPage();
      await screen.findByText('María Quispe');
      const before = vi.mocked(orderApi.listAdminOrders).mock.calls.length;

      act(() => stream().onerror?.());
      expect(await screen.findByText(/Sin conexión en tiempo real/)).toBeInTheDocument();

      act(() => stream().onopen?.());
      await waitFor(() => expect(screen.queryByText(/Sin conexión en tiempo real/)).not.toBeInTheDocument());
      await waitFor(() => expect(vi.mocked(orderApi.listAdminOrders).mock.calls.length).toBeGreaterThan(before));
    });
  });
});
