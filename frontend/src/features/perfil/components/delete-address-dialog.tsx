import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import type { Address } from '@/features/perfil/address-api';
import { useDeleteAddress } from '@/features/perfil/use-address-mutations';

interface DeleteAddressDialogProps {
  address: Address | null;
  onClose: () => void;
  onDeleted: (address: Address) => void;
}

export function DeleteAddressDialog({ address, onClose, onDeleted }: DeleteAddressDialogProps) {
  const deleteAddress = useDeleteAddress();

  function close() {
    deleteAddress.reset();
    onClose();
  }

  async function confirm() {
    if (!address) return;
    try {
      await deleteAddress.mutateAsync(address.id);
    } catch {
      return;
    }
    onDeleted(address);
  }

  return (
    <Dialog open={address !== null} title="Eliminar dirección" onClose={close}>
      <div className="flex flex-col gap-5">
        {deleteAddress.isError ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            No pudimos eliminar la dirección, intenta de nuevo.
          </p>
        ) : null}
        <p className="text-base text-ink">
          ¿Quieres eliminar <strong>{address?.label}</strong> ({address?.address})?
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={deleteAddress.isPending}>
            Eliminar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
