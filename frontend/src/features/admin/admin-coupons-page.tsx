import { useState } from 'react';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import type { AdminCoupon } from '@/features/admin/admin-coupon-api';
import { CouponDialog } from '@/features/admin/components/coupon-dialog';
import { CouponTable } from '@/features/admin/components/coupon-table';
import { DeleteCouponDialog } from '@/features/admin/components/delete-coupon-dialog';
import { useSetCouponActive } from '@/features/admin/use-admin-coupon-mutations';
import { useAdminCoupons } from '@/features/admin/use-admin-coupons';

export function AdminCouponsPage() {
  const { data, isPending, isError, refetch } = useAdminCoupons();
  const setCouponActive = useSetCouponActive();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | undefined>();
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  // Switch values shown while their request is in flight, keyed by coupon id
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const isActive = (coupon: AdminCoupon) => saving[coupon.id] ?? coupon.active;
  const isSaving = (coupon: AdminCoupon) => coupon.id in saving;

  async function toggle(coupon: AdminCoupon, active: boolean) {
    setSaving((current) => ({ ...current, [coupon.id]: active }));
    try {
      await setCouponActive.mutateAsync({ id: coupon.id, active });
    } catch {
      setErrorNotice('No pudimos actualizar el cupón, intenta de nuevo');
    } finally {
      setSaving((current) => {
        const { [coupon.id]: _done, ...rest } = current;
        return rest;
      });
    }
  }

  function openForm(coupon?: AdminCoupon) {
    setEditing(coupon);
    setFormOpen(true);
  }

  function saved(message: string) {
    setFormOpen(false);
    setNotice(message);
  }

  function removed() {
    setDeleting(null);
    setNotice('Cupón eliminado');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-ink text-title-lg">Cupones</h1>
        {data && data.length > 0 ? <Button onClick={() => openForm()}>Agregar cupón</Button> : null}
      </div>

      {isPending ? <p className="text-body text-ink-muted">Cargando los cupones...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-body font-bold text-error-text">No pudimos cargar los cupones.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {data && data.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-ink-muted">Aún no tienes cupones</p>
          <Button onClick={() => openForm()}>Agregar cupón</Button>
        </div>
      ) : null}

      {data && data.length > 0 ? (
        <CouponTable
          coupons={data}
          isActive={isActive}
          isSaving={isSaving}
          onToggle={toggle}
          onEdit={openForm}
          onDelete={setDeleting}
        />
      ) : null}

      <CouponDialog open={formOpen} coupon={editing} onClose={() => setFormOpen(false)} onSaved={saved} />
      <DeleteCouponDialog coupon={deleting} onClose={() => setDeleting(null)} onDeleted={removed} />

      {errorNotice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="error" title={errorNotice} onClose={() => setErrorNotice(null)} />
        </div>
      ) : null}
      {notice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="success" title={notice} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
