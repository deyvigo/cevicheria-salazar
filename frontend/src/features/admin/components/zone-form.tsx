import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Switch } from '@/components/switch';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { ZoneColorPicker } from '@/features/admin/components/zone-color-picker';
import { useCreateDeliveryZone, useUpdateDeliveryZone } from '@/features/admin/use-admin-delivery-zone-mutations';
import type { ZoneColorId } from '@/features/admin/zone-colors';
import { hasSelfIntersection, sameCoordinates, type ZonePoint } from '@/features/admin/zone-geometry';
import type { ApiErrorResponse } from '@/lib/api';

const MIN_POINTS = 3;
const CROSSING = 'Los lados de la zona no pueden cruzarse.';

const zoneSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(60, 'Usa 60 caracteres como máximo.'),
  price: z
    .string()
    .trim()
    .min(1, 'La tarifa es obligatoria.')
    .regex(/^\d{1,2}(\.\d{1,2})?$/, 'Usa un monto válido, hasta S/ 99.99 y 2 decimales.')
    .refine((value) => Number(value) > 0, 'La tarifa debe ser mayor que 0.'),
  active: z.boolean(),
});

type ZoneValues = z.infer<typeof zoneSchema>;

interface ZoneFormProps {
  zone?: DeliveryZone;
  points: ZonePoint[];
  color: ZoneColorId;
  mapFailed: boolean;
  onPointsChange: (points: ZonePoint[]) => void;
  onColorChange: (color: ZoneColorId) => void;
  onCancel: () => void;
  onSaved: (message: string, zoneId: number) => void;
}

function initialValues(zone?: DeliveryZone): ZoneValues {
  return { name: zone?.name ?? '', price: zone ? zone.price.toFixed(2) : '', active: zone?.active ?? true };
}

export function ZoneForm({ zone, points, color, mapFailed, onPointsChange, onColorChange, onCancel, onSaved }: ZoneFormProps) {
  const createZone = useCreateDeliveryZone();
  const updateZone = useUpdateDeliveryZone();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ZoneValues>({ resolver: zodResolver(zoneSchema), defaultValues: initialValues(zone) });

  const active = watch('active');
  const changed = isDirty || color !== (zone?.color ?? color) || !sameCoordinates(points, zone?.coordinates ?? []);
  const isNew = zone === undefined;
  const shapeError =
    points.length >= MIN_POINTS && hasSelfIntersection(points)
      ? CROSSING
      : submitted && points.length < MIN_POINTS
        ? 'Dibuja al menos 3 puntos en el mapa.'
        : undefined;

  async function onSubmit(values: ZoneValues) {
    if (points.length < MIN_POINTS || hasSelfIntersection(points)) return;
    const payload = { name: values.name.trim(), price: Number(values.price), color, active: values.active, coordinates: points };
    let saved: DeliveryZone;
    try {
      saved = zone ? await updateZone.mutateAsync({ id: zone.id, payload }) : await createZone.mutateAsync(payload);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const fieldErrors = error.response?.data.fieldErrors ?? [];
        const name = fieldErrors.find((item) => item.field === 'name');
        if (name) {
          setError('name', { message: name.message });
          return;
        }
        if (fieldErrors.some((item) => item.field.startsWith('coordinates'))) {
          setError('root', { message: 'La forma de la zona no es válida, revisa los puntos.' });
          return;
        }
      }
      setError('root', { message: 'No pudimos guardar la zona, intenta de nuevo.' });
      return;
    }
    onSaved(isNew ? 'Zona agregada' : 'Zona actualizada', saved.id);
  }

  // Marks the form as submitted even when the field validation fails, so a missing shape is reported too
  const handleFormSubmit = handleSubmit(onSubmit);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    setSubmitted(true);
    return handleFormSubmit(event);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 overflow-y-auto p-1 lg:h-full" noValidate aria-label={isNew ? 'Agregar zona' : 'Editar zona'}>
      <h2 className="font-display text-ink text-[22px] leading-7 font-semibold">{isNew ? 'Agregar zona' : 'Editar zona'}</h2>
      {errors.root ? (
        <p role="alert" className="text-sm font-bold text-error-text">
          {errors.root.message}
        </p>
      ) : null}
      <Input fullWidth label="Nombre" error={errors.name?.message} {...register('name')} />
      <Input fullWidth label="Tarifa (S/)" inputMode="decimal" placeholder="8.00" error={errors.price?.message} {...register('price')} />
      <ZoneColorPicker value={color} onChange={onColorChange} />
      <div className="flex items-center gap-3">
        <Switch label="Zona activa" checked={active} onChange={(next) => setValue('active', next, { shouldDirty: true })} />
        <span className="text-sm font-bold text-ink">Zona activa</span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-ink">Área en el mapa</p>
        <p className="text-sm text-ink-muted">
          Toca el mapa para añadir puntos. Arrástralos para moverlos, toca uno para quitarlo o toca el punto entre dos para
          añadir otro. Las demás zonas no se pueden tocar mientras tanto.
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={points.length === 0} onClick={() => onPointsChange(points.slice(0, -1))}>
              Deshacer
            </Button>
            <Button type="button" variant="outline" disabled={points.length === 0} onClick={() => onPointsChange([])}>
              Reiniciar
            </Button>
          </div>
          <p className="text-sm text-ink-subtle">{points.length} puntos</p>
        </div>
        {shapeError ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {shapeError}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!changed || isSubmitting || mapFailed}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
