import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Divider } from '@/components/divider';
import { Input } from '@/components/input';
import type { ApiErrorResponse } from '@/lib/api';
import { AuthShell } from './components/auth-shell';
import { GoogleLoginButton } from './components/google-login-button';
import { useLogin } from './use-auth-mutations';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (searchParams.get('error') === 'google') {
      setError('root', {
        message: 'No pudimos iniciar sesión con Google. Intenta de nuevo.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(values);
      navigate('/');
    } catch (error) {
      const message = isAxiosError<ApiErrorResponse>(error) ? error.response?.data.message : undefined;
      setError('root', {
        message: message ?? 'No pudimos iniciar sesión. Intenta de nuevo.',
      });
    }
  }

  return (
    <AuthShell imageSide="left" branded>
      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-[340px] flex-col gap-5" noValidate>
        <h1 className="font-display text-[26px] leading-8 font-semibold text-ink">Inicia sesión</h1>

        {errors.root ? <p className="text-sm font-bold text-error-text">{errors.root.message}</p> : null}

        <GoogleLoginButton />

        <Divider>o inicia con tu correo</Divider>

        <Input
          label="Correo"
          type="email"
          placeholder="Ej. maria@correo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input label="Contraseña" type="password" error={errors.password?.message} {...register('password')} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>

        <p className="text-center text-sm text-ink-muted">
          ¿No tienes cuenta?{' '}
          <Link
            to="/registro"
            className="font-bold text-link underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
          >
            Regístrate
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
