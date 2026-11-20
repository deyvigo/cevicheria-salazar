import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { CodeInput } from '@/features/admin/components/code-input';
import type { AdminOrderRow } from '@/features/admin/admin-order-api';
import type { OrderAction } from '@/features/admin/order-actions';

const CODE_LENGTH = 4;
const schema = z.object({ code: z.string().regex(/^\d{4}$/, 'Ingresa el código de 4 dígitos.') });
type Values = z.infer<typeof schema>;

interface OrderCodeDialogProps {
  target: { order: AdminOrderRow; action: OrderAction } | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (order: AdminOrderRow, action: OrderAction, code: string) => void;
}

export function OrderCodeDialog({ target, busy, error, onClose, onSubmit }: OrderCodeDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  useEffect(() => {
    if (target) reset({ code: '' });
  }, [target, reset]);

  const pickup = target?.order.deliveryType === 'RECOJO';

  return (
    <Dialog open={target !== null} title="Marcar como entregado" onClose={onClose}>
      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit((values) => target && onSubmit(target.order, target.action, values.code))}
        noValidate
      >
        <p className="text-base text-ink">
          {`Pide al cliente el código de entrega del pedido ${target?.order.code ?? ''} ${
            pickup ? 'al recoger' : 'al recibir'
          }. Esta acción no se puede deshacer.`}
        </p>
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <CodeInput
              label="Código de entrega"
              length={CODE_LENGTH}
              value={field.value}
              onChange={field.onChange}
              error={errors.code?.message ?? error ?? undefined}
            />
          )}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            Marcar entregado
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
