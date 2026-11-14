import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as orderApi from '@/features/admin/admin-order-api';
import { AdminOrdersLiveProvider, useOrderEvents, useOrdersConnection, type OrderEvent } from '@/features/admin/admin-orders-live';
import { api } from '@/lib/api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-order-api');
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

class FakeEventSource {
  static CLOSED = 2;
  static instances: FakeEventSource[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((event: { data: string }) => void)[]> = {};

  url: string;
  init?: { withCredentials?: boolean };

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.init = init;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    (this.listeners[type] ??= []).push(listener);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(type: string, data: string) {
    this.listeners[type]?.forEach((listener) => listener({ data }));
  }
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

function Probe({ events }: { events: OrderEvent[] }) {
  useOrderEvents((event) => events.push(event));
  return <p>{useOrdersConnection() ? 'conectado' : 'desconectado'}</p>;
}

function renderLive(events: OrderEvent[] = []) {
  return render(
    <QueryWrapper>
      <AdminOrdersLiveProvider>
        <Probe events={events} />
      </AdminOrdersLiveProvider>
    </QueryWrapper>,
  );
}

describe('AdminOrdersLiveProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.mocked(orderApi.adminOrderEventsUrl).mockReturnValue('http://api/admin/orders/events');
    document.head.innerHTML = '<title>Salazar SAC</title>';
    // jsdom has no canvas
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setVisibility('visible');
  });

  it('abre una sola conexión con credenciales y la cierra al salir del panel', () => {
    const { unmount } = renderLive();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].init).toEqual({ withCredentials: true });

    unmount();
    expect(FakeEventSource.instances[0].readyState).toBe(FakeEventSource.CLOSED);
  });

  it('reparte los avisos con el id del pedido e ignora los que no se entienden', () => {
    const events: OrderEvent[] = [];
    renderLive(events);

    act(() => {
      FakeEventSource.instances[0].emit('pedido-creado', '{"orderId":7}');
      FakeEventSource.instances[0].emit('pedido-creado', 'no es json');
      FakeEventSource.instances[0].emit('pedido-actualizado', '{"orderId":"x"}');
    });

    expect(events).toEqual([{ type: 'created', orderId: 7 }]);
  });

  it('con la pestaña oculta cuenta los pedidos nuevos en el título y lo reinicia al volver', () => {
    renderLive();
    const source = FakeEventSource.instances[0];

    act(() => {
      setVisibility('hidden');
      source.emit('pedido-creado', '{"orderId":1}');
      source.emit('pedido-creado', '{"orderId":2}');
    });
    expect(document.title).toBe('(2) Pedidos | Salazar SAC');

    // A change of stage is not a new order
    act(() => source.emit('pedido-actualizado', '{"orderId":1}'));
    expect(document.title).toBe('(2) Pedidos | Salazar SAC');

    act(() => setVisibility('visible'));
    expect(document.title).toBe('Salazar SAC');
  });

  it('con la pestaña visible no cuenta nada', () => {
    renderLive();

    act(() => FakeEventSource.instances[0].emit('pedido-creado', '{"orderId":1}'));

    expect(document.title).toBe('Salazar SAC');
  });

  it('avisa al volver la conexión tras una caída y no antes', () => {
    const events: OrderEvent[] = [];
    const { getByText } = renderLive(events);
    const source = FakeEventSource.instances[0];

    act(() => source.onopen?.());
    expect(events).toEqual([]);

    act(() => source.onerror?.());
    expect(getByText('desconectado')).toBeInTheDocument();

    act(() => source.onopen?.());
    expect(getByText('conectado')).toBeInTheDocument();
    expect(events).toEqual([{ type: 'reconnected' }]);
  });

  it('si el navegador abandona la conexión (sesión vencida) hace una petición normal y la vuelve a abrir', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderLive();
      const source = FakeEventSource.instances[0];

      act(() => {
        source.readyState = FakeEventSource.CLOSED;
        source.onerror?.();
      });
      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/orders/zones'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      expect(FakeEventSource.instances).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
