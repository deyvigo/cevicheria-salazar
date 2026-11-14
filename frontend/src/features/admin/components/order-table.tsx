import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import type { AdminOrderRow, OrderSortField, SortDirection } from '@/features/admin/admin-order-api';
import { AdvanceStatusButton } from '@/features/admin/components/advance-status-button';
import { OrderStatusBadge } from '@/features/admin/components/order-status-badge';
import {
  formatDateTime,
  PAYMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentOf,
  TYPE_LABELS,
} from '@/features/admin/order-labels';
import { formatPrice } from '@/features/catalogo/format';

interface OrderTableProps {
  orders: AdminOrderRow[];
  sort: OrderSortField;
  dir: SortDirection;
  busyId: number | null;
  newOrderIds: ReadonlySet<number>;
  onSort: (field: OrderSortField) => void;
  onOpen: (order: AdminOrderRow) => void;
  onAdvance: (order: AdminOrderRow) => void;
}

const HEADER = 'px-4 py-3 text-left text-base font-bold text-ink whitespace-nowrap';
const CELL = 'px-4 py-3 text-base text-ink align-middle';

function SortHeader({
  field,
  label,
  sort,
  dir,
  onSort,
}: {
  field: OrderSortField;
  label: string;
  sort: OrderSortField;
  dir: SortDirection;
  onSort: (field: OrderSortField) => void;
}) {
  const active = field === sort;
  return (
    <th scope="col" className={HEADER} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded-md font-bold hover:text-ink-muted focus-visible:shadow-focus focus-visible:outline-none"
      >
        {label}
        <ChevronDownIcon className={`h-4 w-4 ${active ? (dir === 'asc' ? 'rotate-180' : '') : 'opacity-30'}`} />
      </button>
    </th>
  );
}

export function OrderTable({ orders, sort, dir, busyId, newOrderIds, onSort, onOpen, onAdvance }: OrderTableProps) {
  const header = (field: OrderSortField, label: string) => (
    <SortHeader field={field} label={label} sort={sort} dir={dir} onSort={onSort} />
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[1100px] border-collapse">
        <thead className="bg-surface-celeste">
          <tr>
            {header('code', 'Código')}
            {header('date', 'Fecha')}
            {header('customer', 'Cliente')}
            <th scope="col" className={HEADER}>
              Tipo
            </th>
            {header('zone', 'Zona')}
            <th scope="col" className={HEADER}>
              Pago
            </th>
            <th scope="col" className={HEADER}>
              Estado de pago
            </th>
            {header('total', 'Total')}
            {header('deliveryStatus', 'Entrega')}
            <th scope="col" className={HEADER}>
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isNew = newOrderIds.has(order.id);
            return (
              <tr key={order.id} className={`border-t border-border ${isNew ? 'bg-surface-naranja' : ''}`}>
                <th
                  scope="row"
                  className={`${CELL} text-left ${isNew ? 'border-l-8 border-l-naranja-500' : 'border-l-8 border-l-transparent'}`}
                >
                  {isNew ? (
                    <span className="mb-1 block w-fit rounded-full bg-naranja-500 px-2 py-0.5 text-xs font-bold text-ink">
                      Nuevo
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpen(order)}
                    aria-label={`Ver detalle del pedido ${order.code}`}
                    className="rounded-md font-bold text-link underline-offset-2 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    {order.code}
                  </button>
                </th>
                <td className={`${CELL} whitespace-nowrap`}>{formatDateTime(order.purchasedAt)}</td>
                <td className={CELL}>{order.customerName}</td>
                <td className={CELL}>{TYPE_LABELS[order.deliveryType]}</td>
                <td className={`${CELL} text-ink-muted`}>{order.zoneName ?? '—'}</td>
                <td className={CELL}>
                  {PAYMENT_LABELS[paymentOf(order)]}
                  {order.cashChange !== null ? (
                    <span className="block text-sm text-ink-muted">Vuelto {formatPrice(order.cashChange)}</span>
                  ) : null}
                </td>
                <td className={CELL}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</td>
                <td className={`${CELL} whitespace-nowrap`}>{formatPrice(order.total)}</td>
                <td className={CELL}>
                  <OrderStatusBadge status={order.deliveryStatus} />
                </td>
                <td className={CELL}>
                  <AdvanceStatusButton order={order} busy={busyId === order.id} onAdvance={onAdvance} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
