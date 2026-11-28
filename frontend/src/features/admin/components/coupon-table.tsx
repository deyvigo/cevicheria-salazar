import { useId } from 'react';
import { IconButton } from '@/components/icon-button';
import { PencilIcon } from '@/components/icons/pencil-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
import { Switch } from '@/components/switch';
import type { AdminCoupon } from '@/features/admin/admin-coupon-api';
import { formatDiscount, formatPerCustomer, formatSeats, formatValidity } from '@/features/admin/coupon-format';

interface CouponTableProps {
  coupons: AdminCoupon[];
  isActive: (coupon: AdminCoupon) => boolean;
  isSaving: (coupon: AdminCoupon) => boolean;
  onToggle: (coupon: AdminCoupon, active: boolean) => void;
  onEdit: (coupon: AdminCoupon) => void;
  onDelete: (coupon: AdminCoupon) => void;
}

const HEADER = 'px-4 py-3 text-left text-label text-ink whitespace-nowrap';
const CELL = 'px-4 py-3 text-body text-ink align-middle';

function Badge({ children, className }: { children: string; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-caption whitespace-nowrap ${className}`}>{children}</span>;
}

function DeleteAction({ coupon, onDelete }: { coupon: AdminCoupon; onDelete: () => void }) {
  const reasonId = useId();
  const button = (
    <IconButton
      onClick={onDelete}
      disabled={coupon.hasOrders}
      aria-describedby={coupon.hasOrders ? reasonId : undefined}
      aria-label={`Eliminar ${coupon.code}`}
    >
      <TrashIcon />
    </IconButton>
  );
  if (!coupon.hasOrders) return button;

  // A disabled button gets no hover or focus events, so the wrapper shows the reason
  return (
    <span className="group relative inline-flex rounded-md focus-visible:shadow-focus focus-visible:outline-none" tabIndex={0}>
      {button}
      <span
        id={reasonId}
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 bottom-full z-10 mb-2 w-64 rounded-md bg-ink p-3 text-left text-body-sm text-bg opacity-0 shadow-md transition-opacity group-focus-visible:visible group-focus-visible:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        Tiene pedidos asociados: desactívalo en su lugar.
      </span>
    </span>
  );
}

export function CouponTable({ coupons, isActive, isSaving, onToggle, onEdit, onDelete }: CouponTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[880px] border-collapse">
        <thead className="bg-surface-celeste">
          <tr>
            <th scope="col" className={HEADER}>
              Código
            </th>
            <th scope="col" className={HEADER}>
              Descuento
            </th>
            <th scope="col" className={HEADER}>
              Usos por persona
            </th>
            <th scope="col" className={HEADER}>
              Cupos
            </th>
            <th scope="col" className={HEADER}>
              Vigencia
            </th>
            <th scope="col" className={HEADER}>
              Activo
            </th>
            <th scope="col" className={`${HEADER} text-center!`}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id} className="border-t border-border">
              <th scope="row" className={`${CELL} text-left`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold break-all">{coupon.code}</span>
                  {coupon.exhausted ? <Badge className="bg-warning-surface text-warning-text">Agotado</Badge> : null}
                  {coupon.expired ? <Badge className="bg-error-surface text-error-text">Vencido</Badge> : null}
                </div>
              </th>
              <td className={CELL}>{formatDiscount(coupon)}</td>
              <td className={CELL}>{formatPerCustomer(coupon)}</td>
              <td className={`${CELL} whitespace-nowrap`}>{formatSeats(coupon)}</td>
              <td className={`${CELL} text-ink-muted`}>{formatValidity(coupon)}</td>
              <td className={CELL}>
                <Switch
                  label={`Activo: ${coupon.code}`}
                  checked={isActive(coupon)}
                  disabled={isSaving(coupon)}
                  onChange={(value) => onToggle(coupon, value)}
                />
              </td>
              <td className={CELL}>
                <div className="flex justify-center gap-3">
                  <IconButton onClick={() => onEdit(coupon)} aria-label={`Editar ${coupon.code}`}>
                    <PencilIcon />
                  </IconButton>
                  <DeleteAction coupon={coupon} onDelete={() => onDelete(coupon)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
