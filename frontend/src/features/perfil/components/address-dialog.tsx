import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import type { Address } from '@/features/perfil/address-api';
import { MapErrorBoundary } from '@/features/perfil/components/map-error-boundary';
import { DEFAULT_LOCATION } from '@/features/perfil/default-location';
import { useCreateAddress, useUpdateAddress } from '@/features/perfil/use-address-mutations';
import type { ApiErrorResponse } from '@/lib/api';

const LocationPicker = lazy(() =>
  import('@/features/perfil/components/location-picker').then((module) => ({ default: module.LocationPicker })),
);

const addressSchema = z.object({
  label: z.string().trim().min(1, 'El nombre es obligatorio.').max(40, 'Usa 40 caracteres como máximo.'),
  address: z.string().trim().min(1, 'La dirección es obligatoria.').max(200, 'Usa 200 caracteres como máximo.'),
  reference: z.string().trim().max(200, 'Usa 200 caracteres como máximo.'),
  latitude: z.number(),
  longitude: z.number(),
});

type AddressValues = z.infer<typeof addressSchema>;

interface AddressDialogProps {
  open: boolean;
  address?: Address;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function initialValues(address?: Address): AddressValues {
  return {
    label: address?.label ?? '',
    address: address?.address ?? '',
    reference: address?.reference ?? '',
    latitude: address?.latitude ?? DEFAULT_LOCATION.latitude,
    longitude: address?.longitude ?? DEFAULT_LOCATION.longitude,
  };
}

export function AddressDialog({ open, address, onClose, onSaved }: AddressDialogProps) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: initialValues(address) });

  useEffect(() => {
    if (open) {
      reset(initialValues(address));
      setMapFailed(false);
      setMapAttempt(0);
    }
  }, [open, address, reset]);

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const moveMarker = useCallback(
    (location: { latitude: number; longitude: number }) => {
      setValue('latitude', location.latitude, { shouldDirty: true });
      setValue('longitude', location.longitude, { shouldDirty: true });
    },
    [setValue],
  );

  const failMap = useCallback(() => setMapFailed(true), []);

  async function onSubmit(values: AddressValues) {
    const payload = { ...values, reference: values.reference || null };
    try {
      if (address) {
        await updateAddress.mutateAsync({ id: address.id, payload });
      } else {
        await createAddress.mutateAsync(payload);
      }
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const known = (error.response?.data.fieldErrors ?? []).filter((item) => item.field in values);
        if (known.length > 0) {
          known.forEach((item) => setError(item.field as keyof AddressValues, { message: item.message }));
          return;
        }
        if (error.response?.status === 409) {
          setError('root', { message: error.response.data.message });
          return;
        }
      }
      setError('root', { message: 'No pudimos guardar la dirección, intenta de nuevo.' });
      return;
    }
    onSaved(address ? 'Dirección actualizada' : 'Dirección agregada');
  }

  const mapFallback = (
    <div role="alert" className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-celeste p-4 text-center">
      <p className="text-sm font-bold text-error-text">No pudimos cargar el mapa. Revisa tu conexión e intenta de nuevo.</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setMapFailed(false);
          setMapAttempt((attempt) => attempt + 1);
        }}
      >
        Reintentar
      </Button>
    </div>
  );

  return (
    <Dialog open={open} title={address ? 'Editar dirección' : 'Agregar dirección'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {errors.root ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {errors.root.message}
          </p>
        ) : null}
        <Input fullWidth label="Nombre de la dirección" placeholder="Casa, Trabajo..." error={errors.label?.message} {...register('label')} />
        <Input fullWidth label="Dirección" autoComplete="street-address" error={errors.address?.message} {...register('address')} />
        <Input fullWidth label="Referencia (opcional)" error={errors.reference?.message} {...register('reference')} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-ink">Ubicación en el mapa</p>
          <p className="text-sm text-ink-muted">Arrastra el marcador o toca el mapa para fijar el punto de entrega.</p>
          {mapFailed ? (
            mapFallback
          ) : (
            <MapErrorBoundary key={mapAttempt} fallback={mapFallback} onError={failMap}>
              <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-lg bg-surface-celeste" />}>
                <LocationPicker value={{ latitude, longitude }} onChange={moveMarker} onTilesFailed={failMap} />
              </Suspense>
            </MapErrorBoundary>
          )}
          {errors.latitude || errors.longitude ? (
            <p role="alert" className="text-sm font-bold text-error-text">
              {errors.latitude?.message ?? errors.longitude?.message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting || mapFailed}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
