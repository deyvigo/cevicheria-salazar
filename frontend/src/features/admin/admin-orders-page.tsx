import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
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
import { CouponOrdersNotice } from '@/features/admin/components/coupon-orders-notice';
import { OrderFilters } from '@/features/admin/components/order-filters';
import { OrderTable } from '@/features/admin/components/order-table';
import { useAdminOrders, useAdminOrderZones } from '@/features/admin/use-admin-orders';
import { OrderCodeDialog } from '@/features/admin/components/order-code-dialog';
import { OrderReasonDialog } from '@/features/admin/components/order-reason-dialog';
import type { OrderAction } from '@/features/admin/order-actions';
import { useChangeOrderStatus, useRefundOrder } from '@/features/admin/use-change-order-status';
import { NOTICE_POSITION } from '@/components/notice-position';

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
  const changeStatus = useChangeOrderStatus();
  const refund = useRefundOrder();
  const { newOrderIds, markSeen, markAllSeen } = useNewOrders();
  const [openId, setOpenId] = useState<number | null>(null);
  const [delivering, setDelivering] = useState<{ order: AdminOrderRow; action: OrderAction } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<{ order: AdminOrderRow; action: OrderAction } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [newOrders, setNewOrders] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyId = changeStatus.isPending
    ? (changeStatus.variables?.order.id ?? null)
    : refund.isPending
      ? (refund.variables?.id ?? null)
      : null;

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

  async function run(order: AdminOrderRow, action: () => Promise<unknown>) {
    markSeen(order.id);
    try {
      await action();
    } catch (error) {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      setNotice({
        variant: 'error',
        title: conflict ? 'El pedido ya había cambiado de estado' : 'No pudimos actualizar el pedido, intenta de nuevo',
      });
    }
  }

  function changeOrder(order: AdminOrderRow, to: OrderAction['to'], details: { reason?: string; deliveryCode?: string } = {}) {
    return run(order, () => changeStatus.mutateAsync({ order, to, ...details }));
  }

  // A rejection or cancellation needs a reason, and delivering needs the code the customer was given
  function requestAction(order: AdminOrderRow, action: OrderAction) {
    if (action.needsReason) setReasoning({ order, action });
    else if (action.needsCode) {
      setCodeError(null);
      setDelivering({ order, action });
    }
    else void changeOrder(order, action.to);
  }

  async function submitReason(order: AdminOrderRow, action: OrderAction, reason: string) {
    setReasoning(null);
    await changeOrder(order, action.to, { reason });
  }

  async function submitCode(order: AdminOrderRow, action: OrderAction, deliveryCode: string) {
    markSeen(order.id);
    try {
      await changeStatus.mutateAsync({ order, to: action.to, deliveryCode });
      setDelivering(null);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setCodeError('El código no coincide. Pídeselo de nuevo al cliente.');
        return;
      }
      setDelivering(null);
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      setNotice({
        variant: 'error',
        title: conflict ? 'El pedido ya había cambiado de estado' : 'No pudimos actualizar el pedido, intenta de nuevo',
      });
    }
  }

  const filtered = hasActiveFilters(view);
  const highlighted = data?.items.filter((order) => newOrderIds.has(order.id)).length ?? 0;
  const showNotice = !isDefaultOrder(view) && newOrders > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-ink text-title-lg">Pedidos</h1>
        {data ? (
          <p className="text-body text-ink-muted">{data.totalItems === 1 ? '1 pedido' : `${data.totalItems} pedidos`}</p>
        ) : null}
      </div>

      <OrderFilters
        view={view}
        zones={zones.data ?? []}
        onChange={change}
        onClear={() => navigate({ ...DEFAULT_VIEW, sort: view.sort, dir: view.dir })}
      />

      {view.coupon ? <CouponOrdersNotice coupon={view.coupon} /> : null}

      {!connected ? (
        <div role="status" className="flex flex-wrap items-center gap-3">
          <p className="text-body text-ink-muted">Sin conexión en tiempo real. Actualiza la lista manualmente.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Actualizar
          </Button>
        </div>
      ) : null}

      {showNotice ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-info-surface px-4 py-3">
          <p className="text-body font-bold text-info-text">
            {newOrders === 1 ? '1 pedido nuevo' : `${newOrders} pedidos nuevos`}
          </p>
          <Button variant="outline" onClick={showNewOrders}>
            Ver pedidos nuevos
          </Button>
        </div>
      ) : null}

      {isPending ? <p className="text-body text-ink-muted">Cargando los pedidos...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-body font-bold text-error-text">No pudimos cargar los pedidos.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data && data.totalItems === 0 ? (
        <p role="status" className="text-body text-ink-muted">
          {filtered ? 'No hay pedidos con estos filtros' : 'No hay pedidos activos'}
        </p>
      ) : null}

      {highlighted > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-body font-bold text-ink">
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
            onAction={requestAction}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      ) : null}

      <OrderDetailDialog
        orderId={openId}
        open={openId !== null && delivering === null && reasoning === null}
        busyId={busyId}
        onClose={() => setOpenId(null)}
        onAction={requestAction}
        onRefund={(order) => void run(order, () => refund.mutateAsync(order))}
      />

      <OrderReasonDialog
        target={reasoning}
        busy={changeStatus.isPending}
        onClose={() => setReasoning(null)}
        onSubmit={submitReason}
      />

      <OrderCodeDialog
        target={delivering}
        busy={changeStatus.isPending}
        error={codeError}
        onClose={() => {
          setDelivering(null);
          setCodeError(null);
        }}
        onSubmit={submitCode}
      />

      {notice ? (
        <div className={NOTICE_POSITION}>
          <Notification variant={notice.variant} title={notice.title} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
