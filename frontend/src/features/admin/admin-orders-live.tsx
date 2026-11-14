import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminOrderEventsUrl, getAdminOrder } from '@/features/admin/admin-order-api';
import { ADMIN_ORDERS_KEY, patchOrderRow } from '@/features/admin/admin-orders-cache';
import { useTabAlert } from '@/features/admin/use-tab-alert';
import { api } from '@/lib/api';

export type OrderEvent = { type: 'created' | 'updated'; orderId: number } | { type: 'reconnected' };
type Listener = (event: OrderEvent) => void;

interface LiveValue {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
  newOrderIds: ReadonlySet<number>;
  markSeen: (orderId: number) => void;
  markAllSeen: () => void;
}

const EMPTY_IDS: ReadonlySet<number> = new Set();

const LiveContext = createContext<LiveValue>({
  connected: true,
  subscribe: () => () => undefined,
  newOrderIds: EMPTY_IDS,
  markSeen: () => undefined,
  markAllSeen: () => undefined,
});

const RETRY_MS = 3000;

function orderIdOf(event: Event): number | null {
  try {
    const id = JSON.parse((event as MessageEvent<string>).data).orderId;
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}

/** One server-sent events connection for the whole admin panel, so the tab counter works from any section. */
export function AdminOrdersLiveProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(true);
  const [unseen, setUnseen] = useState(0);
  // Orders that arrived while the panel was open and that the administrator has not looked at yet
  const [newOrderIds, setNewOrderIds] = useState<ReadonlySet<number>>(EMPTY_IDS);
  useTabAlert(unseen);

  const markSeen = useCallback((orderId: number) => {
    setNewOrderIds((current) => {
      if (!current.has(orderId)) return current;
      const next = new Set(current);
      next.delete(orderId);
      return next;
    });
  }, []);
  const markAllSeen = useCallback(() => setNewOrderIds(EMPTY_IDS), []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setUnseen(0);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let dropped = false;
    let disposed = false;

    const emit = (event: OrderEvent) => listeners.current.forEach((listener) => listener(event));

    function open() {
      source = new EventSource(adminOrderEventsUrl(), { withCredentials: true });
      source.onopen = () => {
        setConnected(true);
        if (dropped) {
          dropped = false;
          emit({ type: 'reconnected' });
        }
      };
      source.onerror = () => {
        dropped = true;
        setConnected(false);
        // A closed stream is not retried by the browser (an expired session answers 401): a normal request
        // renews the session or sends the administrator to the login, then the stream is opened again
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          void api
            .get('/admin/orders/zones')
            .catch(() => undefined)
            .finally(() => {
              if (!disposed) retry = setTimeout(open, RETRY_MS);
            });
        }
      };
      source.addEventListener('pedido-creado', (event) => {
        const orderId = orderIdOf(event);
        if (orderId === null) return;
        if (document.visibilityState === 'hidden') setUnseen((count) => count + 1);
        setNewOrderIds((current) => new Set(current).add(orderId));
        emit({ type: 'created', orderId });
      });
      source.addEventListener('pedido-actualizado', (event) => {
        const orderId = orderIdOf(event);
        if (orderId === null) return;
        // Only worth a request if some table or detail is cached to keep up to date
        if (client.getQueriesData({ queryKey: ADMIN_ORDERS_KEY }).length > 0) {
          getAdminOrder(orderId)
            .then((detail) => patchOrderRow(client, detail.order))
            .catch(() => undefined);
        }
        emit({ type: 'updated', orderId });
      });
    }

    open();
    return () => {
      disposed = true;
      clearTimeout(retry);
      source?.close();
    };
  }, [client]);

  const value = useMemo(
    () => ({ connected, subscribe, newOrderIds, markSeen, markAllSeen }),
    [connected, subscribe, newOrderIds, markSeen, markAllSeen],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useOrdersConnection(): boolean {
  return useContext(LiveContext).connected;
}

export function useNewOrders() {
  const { newOrderIds, markSeen, markAllSeen } = useContext(LiveContext);
  return { newOrderIds, markSeen, markAllSeen };
}

export function useOrderEvents(listener: Listener) {
  const { subscribe } = useContext(LiveContext);
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  useEffect(() => subscribe((event) => latest.current(event)), [subscribe]);
}
