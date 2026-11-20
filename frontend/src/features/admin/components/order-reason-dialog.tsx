import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import type { AdminOrderRow } from '@/features/admin/admin-order-api';
import type { OrderAction } from '@/features/admin/order-actions';

const MAX_REASON = 200;
const schema = z.object({
  reason: z.string().trim().min(1, 'Indica el motivo.').max(MAX_REASON, `Máximo ${MAX_REASON} caracteres.`),
});
type Values = z.infer<typeof schema>;

interface OrderReasonDialogProps {
  target: { order: AdminOrderRow; action: OrderAction } | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (order: AdminOrderRow, action: OrderAction, reason: string) => void;
}

export function OrderReasonDialog({ target, busy, onClose, onSubmit }: OrderReasonDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });

  useEffect(() => {
    if (target) reset({ reason: '' });
  }, [target, reset]);

  return (
    <Dialog
      open={target !== null}
      title={target ? `${target.action.label} el pedido ${target.order.code}` : ''}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit((values) => target && onSubmit(target.order, target.action, values.reason))}
        noValidate
      >
        <Input
          label="Motivo"
          hint="El cliente verá este motivo en Mis pedidos."
          fullWidth
          maxLength={MAX_REASON}
          error={errors.reason?.message}
          {...register('reason')}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" disabled={busy}>
            {target?.action.label}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
