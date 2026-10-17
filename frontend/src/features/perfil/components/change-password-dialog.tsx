import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { PasswordRequirements } from '@/features/auth/components/password-requirements';
import { passwordSchema } from '@/features/auth/password-schema';
import { useChangePassword } from '@/features/perfil/use-profile-mutations';
import type { ApiErrorResponse } from '@/lib/api';

interface ChangePasswordDialogProps {
  open: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_VALUES = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordDialog({ open, hasPassword, onClose, onSaved }: ChangePasswordDialogProps) {
  const changePassword = useChangePassword();

  const schema = z
    .object({
      currentPassword: hasPassword ? z.string().min(1, 'Ingresa tu contraseña actual.') : z.string().optional(),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Las contraseñas no coinciden.',
      path: ['confirmPassword'],
    })
    .refine((data) => !hasPassword || data.newPassword !== data.currentPassword, {
      message: 'La nueva contraseña debe ser distinta de la actual.',
      path: ['newPassword'],
    });

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset(EMPTY_VALUES);
  }, [open, reset]);

  async function onSubmit(values: Values) {
    try {
      await changePassword.mutateAsync({
        currentPassword: hasPassword ? values.currentPassword : undefined,
        newPassword: values.newPassword,
      });
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const fieldError = error.response?.data.fieldErrors?.find(
          (item) => item.field === 'currentPassword' || item.field === 'newPassword',
        );
        if (fieldError) {
          setError(fieldError.field as 'currentPassword' | 'newPassword', { message: fieldError.message });
          return;
        }
        if (error.response?.status === 429) {
          setError('root', { message: error.response.data.message });
          return;
        }
      }
      setError('root', { message: 'No pudimos cambiar tu contraseña. Intenta de nuevo.' });
      return;
    }
    onSaved();
  }

  return (
    <Dialog open={open} title={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {errors.root ? (
          <p role="alert" className="text-sm font-bold text-error-text">
            {errors.root.message}
          </p>
        ) : null}
        {hasPassword ? (
          <Input
          fullWidth
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
        ) : null}
        <PasswordRequirements differentFromCurrent={hasPassword} />
        <Input
          fullWidth
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          fullWidth
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
