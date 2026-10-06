import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import type { ApiErrorResponse } from '@/lib/api';
import { validateResetToken } from './auth-api';
import { AuthShell } from './components/auth-shell';
import { passwordSchema } from './password-schema';
import { useResetPassword } from './use-auth-mutations';

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const INVALID_LINK_MESSAGE = 'Este enlace no es válido o ya venció.';

const LINK_CLASSES =
  'font-bold text-link underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const resetPasswordMutation = useResetPassword();

  const tokenQuery = useQuery({
    queryKey: ['auth', 'reset-token', token],
    // React Query rejects an undefined result
    queryFn: async () => {
      await validateResetToken(token);
      return true;
    },
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      await resetPasswordMutation.mutateAsync({ token, password: values.password });
      navigate('/iniciar-sesion', { state: { passwordReset: true } });
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const fieldError = error.response?.data.fieldErrors?.find((item) => item.field === 'password');
        if (fieldError) {
          setError('password', { message: fieldError.message });
          return;
        }
        // The link expired or was used while the form was open
        if (error.response?.status === 400) {
          await tokenQuery.refetch();
          return;
        }
      }
      setError('root', { message: 'No pudimos cambiar tu contraseña. Intenta de nuevo.' });
    }
  }

  const linkIsInvalid = token === '' || tokenQuery.isError;

  return (
    <AuthShell imageSide="left" branded>
      <div className="flex w-full max-w-[340px] flex-col gap-5">
        <h1 className="font-display text-[26px] leading-8 font-semibold text-ink">Crea una nueva contraseña</h1>

        {linkIsInvalid ? (
          <>
            <p role="alert" className="text-sm font-bold text-error-text">
              {INVALID_LINK_MESSAGE}
            </p>
            <Link to="/olvide-contrasena" className={LINK_CLASSES}>
              Pedir un enlace nuevo
            </Link>
          </>
        ) : tokenQuery.isPending ? (
          <p className="text-sm text-ink-muted">Verificando tu enlace…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            {errors.root ? <p className="text-sm font-bold text-error-text">{errors.root.message}</p> : null}

            <Input
              label="Nueva contraseña"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
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
