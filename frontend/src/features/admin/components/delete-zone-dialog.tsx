import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { useDeleteDeliveryZone } from '@/features/admin/use-admin-delivery-zone-mutations';

interface DeleteZoneDialogProps {
  zone: DeliveryZone | null;
  onClose: () => void;
  onDeleted: (zone: DeliveryZone) => void;
}

export function DeleteZoneDialog({ zone, onClose, onDeleted }: DeleteZoneDialogProps) {
  const deleteZone = useDeleteDeliveryZone();

  function close() {
    deleteZone.reset();
    onClose();
  }

  async function confirm() {
    if (!zone) return;
    try {
      await deleteZone.mutateAsync(zone.id);
    } catch {
      return;
    }
    onDeleted(zone);
  }

  return (
    <Dialog open={zone !== null} title="Eliminar zona" onClose={close}>
      <div className="flex flex-col gap-5">
        {deleteZone.isError ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            No pudimos eliminar la zona, intenta de nuevo.
          </p>
        ) : null}
        <p className="text-base text-ink">
          ¿Quieres eliminar <strong>{zone?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={deleteZone.isPending}>
            Eliminar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
