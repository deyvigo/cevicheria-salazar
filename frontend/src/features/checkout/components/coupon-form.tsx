import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import type { CouponQuote, OrderItemPayload } from '@/features/checkout/checkout-api';
import { couponErrorMessage, useApplyCoupon } from '@/features/checkout/use-coupon-quote';

const schema = z.object({
  code: z.string().trim().min(1, 'Ingresa un código.').max(30, 'Este código no es válido.'),
});

type Values = z.infer<typeof schema>;

interface CouponFormProps {
  items: OrderItemPayload[];
  appliedCode: string | null;
  // A failure to quote the applied coupon again that is not a rejection, such as a network error
  appliedError?: string | null;
  disabled?: boolean;
  onApplied: (quote: CouponQuote) => void;
  onRemove: () => void;
}

export function CouponForm({ items, appliedCode, appliedError, disabled, onApplied, onRemove }: CouponFormProps) {
  const applyCoupon = useApplyCoupon();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  async function onSubmit(values: Values) {
    try {
      const quote = await applyCoupon.mutateAsync({ code: values.code, items });
      reset({ code: '' });
      onApplied(quote);
    } catch (error) {
      setError('code', { message: couponErrorMessage(error) });
    }
  }

  if (appliedCode !== null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-body-sm text-ink-muted">
            Cupón <strong className="text-ink">{appliedCode}</strong> aplicado
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="shrink-0 rounded-sm text-label text-link underline underline-offset-2 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:text-ink-disabled disabled:no-underline"
          >
            Quitar
          </button>
        </div>
        {appliedError ? (
          <p role="alert" className="text-body-sm font-bold text-error-text">
            {appliedError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex items-start gap-2">
      <Input
        label="Código de descuento"
        autoComplete="off"
        fullWidth
        error={errors.code?.message}
        disabled={disabled || applyCoupon.isPending}
        {...register('code')}
      />
      <Button
        type="submit"
        variant="secondary"
        className="mt-7 h-12 shrink-0"
        disabled={disabled || applyCoupon.isPending || items.length === 0}
        aria-busy={applyCoupon.isPending}
      >
        {applyCoupon.isPending ? 'Aplicando...' : 'Aplicar'}
      </Button>
    </form>
  );
}
