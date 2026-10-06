import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Notification } from '@/components/notification';
import type { ApiErrorResponse } from '@/lib/api';
import { AuthShell } from './components/auth-shell';
import { useForgotPassword } from './use-auth-mutations';

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const LINK_CLASSES =
  'font-bold text-link underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none';

export function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      setConfirmation(await forgotPasswordMutation.mutateAsync(values.email));
    } catch (error) {
      const message = isAxiosError<ApiErrorResponse>(error) ? error.response?.data.message : undefined;
      setError('root', { message: message ?? 'No pudimos enviar el correo. Intenta de nuevo.' });
    }
  }

  return (
    <AuthShell imageSide="left" branded>
      <div className="flex w-full max-w-[340px] flex-col gap-5">
        <h1 className="font-display text-[26px] leading-8 font-semibold text-ink">Recupera tu contraseña</h1>

        {confirmation ? (
          <Notification variant="success" title="Revisa tu correo" message={confirmation} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            <p className="text-sm text-ink-muted">
              Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
            </p>

            {errors.root ? <p className="text-sm font-bold text-error-text">{errors.root.message}</p> : null}

            <Input
              label="Correo"
              type="email"
              placeholder="Ej. maria@correo.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-ink-muted">
          <Link to="/iniciar-sesion" className={LINK_CLASSES}>
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
