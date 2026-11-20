import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { useCancelMyOrder } from '@/features/perfil/use-cancel-my-order';

interface CancelOrderDialogProps {
  order: { id: number; code: string } | null;
  onClose: () => void;
}

export function CancelOrderDialog({ order, onClose }: CancelOrderDialogProps) {
  const cancel = useCancelMyOrder();

  function close() {
    cancel.reset();
    onClose();
  }

  async function confirm() {
    if (!order) return;
    try {
      await cancel.mutateAsync(order.id);
    } catch {
      return;
    }
    close();
  }

  return (
    <Dialog open={order !== null} title="Cancelar pedido" onClose={close}>
      <div className="flex flex-col gap-5">
        {cancel.isError ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            No pudimos cancelar el pedido. Puede que el restaurante ya lo haya aceptado.
          </p>
        ) : null}
        <p className="text-base text-ink">
          ¿Quieres cancelar el pedido <strong>{order?.code}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={close}>
            Volver
          </Button>
          <Button type="button" onClick={confirm} disabled={cancel.isPending}>
            Cancelar pedido
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
