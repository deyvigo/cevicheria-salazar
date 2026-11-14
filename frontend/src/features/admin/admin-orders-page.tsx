import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Notification } from '@/components/notification';
import { Pagination } from '@/components/pagination';
import { listAdminOrders, type AdminOrderRow, type OrderSortField } from '@/features/admin/admin-order-api';
import { ADMIN_ORDERS_LIST_KEY } from '@/features/admin/admin-orders-cache';
import { useNewOrders, useOrderEvents, useOrdersConnection, type OrderEvent } from '@/features/admin/admin-orders-live';
import {
  DEFAULT_VIEW,
  hasActiveFilters,
  isDefaultOrder,
  parseView,
  toQuery,
  viewToParams,
  type OrdersView,
} from '@/features/admin/admin-orders-view';
import { OrderDetailDialog } from '@/features/admin/components/order-detail-dialog';
import { OrderFilters } from '@/features/admin/components/order-filters';
import { OrderTable } from '@/features/admin/components/order-table';
import { useAdminOrders, useAdminOrderZones } from '@/features/admin/use-admin-orders';
import { useAdvanceOrder } from '@/features/admin/use-advance-order';

const REFRESH_DELAY_MS = 300;

interface Notice {
  variant: 'success' | 'error';
  title: string;
}

export function AdminOrdersPage() {
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseView(params), [params]);
  const query = useMemo(() => toQuery(view), [view]);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminOrders(query);
  const zones = useAdminOrderZones();
  const connected = useOrdersConnection();
  const advance = useAdvanceOrder();
  const { newOrderIds, markSeen, markAllSeen } = useNewOrders();
  const [openId, setOpenId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<AdminOrderRow | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [newOrders, setNewOrders] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyId = advance.isPending ? (advance.variables?.id ?? null) : null;

  useEffect(() => () => clearTimeout(refreshTimer.current), []);

  function navigate(next: OrdersView, replace = false) {
    if (isDefaultOrder(next)) setNewOrders(0);
    setParams(viewToParams(next), { replace });
  }

  function change(changes: Partial<OrdersView>) {
    navigate({ ...view, page: 1, ...changes });
  }

  function changeSort(field: OrderSortField) {
    // Dates and totals read best newest or largest first; the first click on any other column goes ascending
    const dir = field === view.sort ? (view.dir === 'asc' ? 'desc' : 'asc') : 'asc';
    navigate({ ...view, page: 1, sort: field, dir });
  }

  function goToPage(page: number) {
    navigate({ ...view, page }, true);
  }

  // The server returns the last page when the requested one no longer exists
  useEffect(() => {
    if (data && !isPlaceholderData && data.page !== view.page) goToPage(data.page);
  });

  // Reading the table with a different order or page: a new order must not shuffle the rows under the cursor
  function onOrderEvent(event: OrderEvent) {
    if (event.type === 'reconnected') {
      void client.invalidateQueries({ queryKey: ADMIN_ORDERS_LIST_KEY });
      return;
    }
    if (event.type !== 'created') return;
    if (isDefaultOrder(view)) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(
        () => void client.invalidateQueries({ queryKey: ADMIN_ORDERS_LIST_KEY }),
        REFRESH_DELAY_MS,
      );
      return;
    }
    // Only orders that pass the current filters count as new
    listAdminOrders({ ...query, page: 1, sort: 'date', dir: 'desc' })
      .then((page) => {
        if (page.items.some((order) => order.id === event.orderId)) setNewOrders((count) => count + 1);
      })
      .catch(() => undefined);
  }
  useOrderEvents(onOrderEvent);

  function showNewOrders() {
    setNewOrders(0);
    setParams(viewToParams({ ...view, page: 1, sort: DEFAULT_VIEW.sort, dir: DEFAULT_VIEW.dir }));
    void client.invalidateQueries({ queryKey: ADMIN_ORDERS_LIST_KEY });
  }

  async function advanceOrder(order: AdminOrderRow) {
    markSeen(order.id);
    try {
      await advance.mutateAsync(order);
    } catch (error) {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      setNotice({
        variant: 'error',
        title: conflict ? 'El pedido ya había cambiado de estado' : 'No pudimos actualizar el pedido, intenta de nuevo',
      });
    }
  }

  // Delivered is final, so it is the only step that asks first
  function requestAdvance(order: AdminOrderRow) {
    if (order.deliveryStatus === 'EN_CAMINO') setConfirming(order);
    else void advanceOrder(order);
  }

  function confirmDelivered() {
    const order = confirming;
    setConfirming(null);
    if (order) void advanceOrder(order);
  }

  const filtered = hasActiveFilters(view);
  const highlighted = data?.items.filter((order) => newOrderIds.has(order.id)).length ?? 0;
  const showNotice = !isDefaultOrder(view) && newOrders > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Pedidos</h1>
        {data ? (
          <p className="text-base text-ink-muted">{data.totalItems === 1 ? '1 pedido' : `${data.totalItems} pedidos`}</p>
        ) : null}
      </div>

      <OrderFilters
        view={view}
        zones={zones.data ?? []}
        onChange={change}
        onClear={() => navigate({ ...DEFAULT_VIEW, sort: view.sort, dir: view.dir })}
      />

      {!connected ? (
        <div role="status" className="flex flex-wrap items-center gap-3">
          <p className="text-base text-ink-muted">Sin conexión en tiempo real. Actualiza la lista manualmente.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Actualizar
          </Button>
        </div>
      ) : null}

      {showNotice ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-info-surface px-4 py-3">
          <p className="text-base font-bold text-info-text">
            {newOrders === 1 ? '1 pedido nuevo' : `${newOrders} pedidos nuevos`}
          </p>
          <Button variant="outline" onClick={showNewOrders}>
            Ver pedidos nuevos
          </Button>
        </div>
      ) : null}

      {isPending ? <p className="text-base text-ink-muted">Cargando los pedidos...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar los pedidos.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data && data.totalItems === 0 ? (
        <p role="status" className="text-base text-ink-muted">
          {filtered ? 'No hay pedidos con estos filtros' : 'No hay pedidos activos'}
        </p>
      ) : null}

      {highlighted > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-base font-bold text-ink">
            {highlighted === 1 ? '1 pedido nuevo sin revisar' : `${highlighted} pedidos nuevos sin revisar`}
          </p>
          <Button variant="outline" onClick={markAllSeen}>
            Marcar como vistos
          </Button>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <OrderTable
            orders={data.items}
            sort={view.sort}
            dir={view.dir}
            busyId={busyId}
            onSort={changeSort}
            newOrderIds={newOrderIds}
            onOpen={(order) => {
              markSeen(order.id);
              setOpenId(order.id);
            }}
            onAdvance={requestAdvance}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      ) : null}

      <OrderDetailDialog
        orderId={openId}
        open={openId !== null && confirming === null}
        busyId={busyId}
        onClose={() => setOpenId(null)}
        onAdvance={requestAdvance}
      />

      <Dialog open={confirming !== null} title="Marcar como entregado" onClose={() => setConfirming(null)}>
        <p className="text-base text-ink">
          {`¿Marcar el pedido ${confirming?.code ?? ''} como entregado? Esta acción no se puede deshacer.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirming(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmDelivered}>Marcar entregado</Button>
        </div>
      </Dialog>

      {notice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant={notice.variant} title={notice.title} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
