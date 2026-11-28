import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { Switch } from '@/components/switch';
import type { AdminCoupon, CouponPayload, DiscountType } from '@/features/admin/admin-coupon-api';
import { useCreateCoupon, useUpdateCoupon } from '@/features/admin/use-admin-coupon-mutations';
import type { ApiErrorResponse } from '@/lib/api';

const MONEY = /^\d{1,8}(\.\d{1,2})?$/;
const WHOLE = /^\d+$/;

function optionalCount(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || (WHOLE.test(value) && Number(value) > 0), message)
    .transform((value) => (value === '' ? null : Number(value)));
}

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'El código es obligatorio.')
      .max(30, 'Usa 30 caracteres como máximo.')
      .regex(/^[A-Z0-9_-]+$/, 'Usa solo letras, números, guiones y guiones bajos.'),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z
      .string()
      .trim()
      .refine((value) => MONEY.test(value) && Number(value) > 0, 'Ingresa un valor mayor que 0, con hasta 2 decimales.')
      .transform(Number),
    maxUsesPerCustomer: optionalCount('Los usos por persona deben ser un número entero mayor que 0.'),
    maxUses: optionalCount('Los cupos deben ser un número entero mayor que 0.'),
    minSubtotal: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || (MONEY.test(value) && Number(value) > 0),
        'Ingresa un monto mayor que 0, con hasta 2 decimales.',
      )
      .transform((value) => (value === '' ? null : Number(value))),
    startsOn: z.string().transform((value) => value || null),
    endsOn: z.string().transform((value) => value || null),
    active: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.discountType === 'PERCENTAGE' && values.discountValue > 100) {
      context.addIssue({ code: 'custom', path: ['discountValue'], message: 'El porcentaje no puede ser mayor que 100.' });
    }
    // ISO days compare correctly as text
    if (values.startsOn && values.endsOn && values.endsOn < values.startsOn) {
      context.addIssue({
        code: 'custom',
        path: ['endsOn'],
        message: 'La fecha de fin no puede ser anterior a la de inicio.',
      });
    }
  });

type CouponValues = z.input<typeof couponSchema>;

interface CouponDialogProps {
  open: boolean;
  coupon?: AdminCoupon;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const text = (value: number | null) => (value === null ? '' : String(value));

function initialValues(coupon?: AdminCoupon): CouponValues {
  return {
    code: coupon?.code ?? '',
    discountType: coupon?.discountType ?? 'PERCENTAGE',
    discountValue: coupon ? String(coupon.discountValue) : '',
    maxUsesPerCustomer: text(coupon?.maxUsesPerCustomer ?? null),
    maxUses: text(coupon?.maxUses ?? null),
    minSubtotal: text(coupon?.minSubtotal ?? null),
    startsOn: coupon?.startsOn ?? '',
    endsOn: coupon?.endsOn ?? '',
    active: coupon?.active ?? true,
  };
}

const TYPES: ReadonlyArray<{ value: DiscountType; label: string }> = [
  { value: 'PERCENTAGE', label: 'Porcentaje' },
  { value: 'FIXED', label: 'Monto fijo' },
];

const OPTIONAL = 'Opcional. Vacío = sin límite.';

export function CouponDialog({ open, coupon, onClose, onSaved }: CouponDialogProps) {
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CouponValues, unknown, CouponPayload>({
    resolver: zodResolver(couponSchema),
    defaultValues: initialValues(coupon),
  });

  useEffect(() => {
    if (open) reset(initialValues(coupon));
  }, [open, coupon, reset]);

  const discountType = watch('discountType');
  const active = watch('active');
  const codeLocked = coupon?.hasOrders ?? false;

  async function onSubmit(payload: CouponPayload) {
    try {
      if (coupon) {
        await updateCoupon.mutateAsync({ id: coupon.id, payload });
      } else {
        await createCoupon.mutateAsync(payload);
      }
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const known = (error.response?.data.fieldErrors ?? []).filter((item) => item.field in initialValues());
        if (known.length > 0) {
          known.forEach((item) => setError(item.field as keyof CouponValues, { message: item.message }));
          return;
        }
      }
      setError('root', { message: 'No pudimos guardar el cupón, intenta de nuevo.' });
      return;
    }
    onSaved(coupon ? 'Cupón actualizado' : 'Cupón agregado');
  }

  return (
    <Dialog open={open} title={coupon ? 'Editar cupón' : 'Agregar cupón'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {errors.root ? (
          <p role="alert" className="text-body-sm font-bold text-error-text">
            {errors.root.message}
          </p>
        ) : null}
        <Input
          fullWidth
          label="Código"
          autoCapitalize="characters"
          autoComplete="off"
          readOnly={codeLocked}
          className="read-only:cursor-not-allowed read-only:bg-surface-disabled read-only:text-ink-disabled"
          hint={codeLocked ? 'El código no se puede cambiar porque ya se usó.' : undefined}
          error={errors.code?.message}
          {...register('code')}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label text-ink">Tipo de descuento</legend>
          <div className="flex gap-2">
            {TYPES.map((type) => (
              <label key={type.value} className="flex-1">
                <input type="radio" value={type.value} className="peer sr-only" {...register('discountType')} />
                <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-border-strong px-4 text-button text-ink peer-checked:border-action peer-checked:bg-naranja-100 peer-checked:ring-2 peer-checked:ring-action peer-focus-visible:shadow-focus">
                  {type.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Input
          fullWidth
          label={discountType === 'PERCENTAGE' ? 'Valor (%)' : 'Valor (S/)'}
          inputMode="decimal"
          autoComplete="off"
          error={errors.discountValue?.message}
          {...register('discountValue')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            fullWidth
            label="Usos por persona"
            inputMode="numeric"
            autoComplete="off"
            hint={OPTIONAL}
            error={errors.maxUsesPerCustomer?.message}
            {...register('maxUsesPerCustomer')}
          />
          <Input
            fullWidth
            label="Cupos"
            inputMode="numeric"
            autoComplete="off"
            hint="Pedidos en total hasta que se acabe. Vacío = sin límite."
            error={errors.maxUses?.message}
            {...register('maxUses')}
          />
        </div>
        <Input
          fullWidth
          label="Compra mínima (S/)"
          inputMode="decimal"
          autoComplete="off"
          hint="Opcional. Se mide sobre el subtotal de los platos."
          error={errors.minSubtotal?.message}
          {...register('minSubtotal')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input fullWidth label="Desde" type="date" hint="Opcional." error={errors.startsOn?.message} {...register('startsOn')} />
          <Input fullWidth label="Hasta" type="date" hint="Opcional. Incluye todo ese día." error={errors.endsOn?.message} {...register('endsOn')} />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            label="Activo"
            checked={active}
            onChange={(value) => setValue('active', value, { shouldDirty: true })}
          />
          <span className="text-label text-ink" aria-hidden="true">
            Activo
          </span>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
