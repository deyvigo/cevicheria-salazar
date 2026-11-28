import { isAxiosError } from 'axios';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import type { AdminCoupon } from '@/features/admin/admin-coupon-api';
import { useDeleteCoupon } from '@/features/admin/use-admin-coupon-mutations';

interface DeleteCouponDialogProps {
  coupon: AdminCoupon | null;
  onClose: () => void;
  onDeleted: (coupon: AdminCoupon) => void;
}

export function DeleteCouponDialog({ coupon, onClose, onDeleted }: DeleteCouponDialogProps) {
  const deleteCoupon = useDeleteCoupon();

  function close() {
    deleteCoupon.reset();
    onClose();
  }

  async function confirm() {
    if (!coupon) return;
    try {
      await deleteCoupon.mutateAsync(coupon.id);
    } catch {
      return;
    }
    onDeleted(coupon);
  }

  const inUse = isAxiosError(deleteCoupon.error) && deleteCoupon.error.response?.status === 409;

  return (
    <Dialog open={coupon !== null} title="Eliminar cupón" onClose={close}>
      <div className="flex flex-col gap-5">
        {deleteCoupon.isError ? (
          <p role="alert" className="text-body-sm font-bold text-error-text">
            {inUse ? 'Tiene pedidos asociados: desactívalo en su lugar.' : 'No pudimos eliminar el cupón, intenta de nuevo.'}
          </p>
        ) : null}
        <p className="text-body text-ink">
          ¿Eliminar el cupón <strong>{coupon?.code}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={deleteCoupon.isPending}>
            Eliminar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
