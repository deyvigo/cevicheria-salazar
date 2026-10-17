import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import type { AuthUser } from '@/context/auth-context';
import type { ApiErrorResponse } from '@/lib/api';
import { useUpdateProfile } from '@/features/perfil/use-profile-mutations';

const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es obligatorio.'),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio.'),
  phone: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio.')
    .regex(/^9\d{8}$/, 'Ingresa un teléfono de 9 dígitos que empiece con 9.'),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

interface EditProfileDialogProps {
  open: boolean;
  user: AuthUser;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProfileDialog({ open, user, onClose, onSaved }: EditProfileDialogProps) {
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EditProfileValues>({ resolver: zodResolver(editProfileSchema) });

  useEffect(() => {
    if (open) {
      reset({ firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' });
    }
  }, [open, reset, user.firstName, user.lastName, user.phone]);

  async function onSubmit(values: EditProfileValues) {
    try {
      await updateProfile.mutateAsync(values);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const fieldErrors = error.response?.data.fieldErrors ?? [];
        const known = fieldErrors.filter((item) => item.field in values);
        if (known.length > 0) {
          known.forEach((item) => setError(item.field as keyof EditProfileValues, { message: item.message }));
          return;
        }
      }
      setError('root', { message: 'No pudimos guardar tus datos, intenta de nuevo.' });
      return;
    }
    onSaved();
  }

  return (
    <Dialog open={open} title="Editar datos" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center gap-5" noValidate>
        {errors.root ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {errors.root.message}
          </p>
        ) : null}
        <Input label="Nombres" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Apellidos" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
        <Input
          label="Teléfono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="flex justify-center gap-3">
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            Guardar
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
