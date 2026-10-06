import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/button';
import { Divider } from '@/components/divider';
import { Input } from '@/components/input';
import { Notification } from '@/components/notification';
import type { ApiErrorResponse } from '@/lib/api';
import { AuthShell } from './components/auth-shell';
import { GoogleLoginButton } from './components/google-login-button';
import { useRegister } from './use-auth-mutations';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'El nombre es obligatorio.'),
    lastName: z.string().trim().min(1, 'El apellido es obligatorio.'),
    email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
    phone: z
      .string()
      .trim()
      .min(1, 'El teléfono es obligatorio.')
      .regex(/^9[0-9]{8}$/, 'Ingresa un teléfono de 9 dígitos que empiece con 9.'),
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria.')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'La contraseña debe tener al menos 8 caracteres, con letras y números.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const BACKEND_FIELDS: ReadonlyArray<keyof RegisterFormValues> = ['email', 'password', 'firstName', 'lastName', 'phone'];

export function RegisterPage() {
  const registerMutation = useRegister();
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values);
      setRegistered(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error) && error.response?.data.fieldErrors) {
        for (const fieldError of error.response.data.fieldErrors) {
          if ((BACKEND_FIELDS as string[]).includes(fieldError.field)) {
            setError(fieldError.field as keyof RegisterFormValues, {
              message: fieldError.message,
            });
          }
        }
      }
    }
  }

  return (
    <AuthShell imageSide="right" branded>
      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-[340px] flex-col gap-5" noValidate>
        <h1 className="font-display text-[26px] leading-8 font-semibold text-ink">Crea tu cuenta</h1>

        <GoogleLoginButton />

        <Divider>o regístrate con tu correo</Divider>

        <Input label="Nombres" placeholder="Ej. María" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Apellidos" placeholder="Ej. Quispe" error={errors.lastName?.message} {...register('lastName')} />
        <Input
          label="Correo"
          type="email"
          placeholder="Ej. maria@correo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input label="Teléfono" placeholder="987654321" error={errors.phone?.message} {...register('phone')} />
        <Input label="Contraseña" type="password" error={errors.password?.message} {...register('password')} />
        <Input
          label="Confirmar contraseña"
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>

        <p className="text-center text-sm text-ink-muted">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/iniciar-sesion"
            className="font-bold text-link underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
          >
            Inicia sesión
          </Link>
        </p>
      </form>

      {registered ? (
        <div className="fixed right-6 bottom-6">
          <Notification variant="success" title="Tu cuenta fue creada" message="Ya puedes empezar a pedir." />
        </div>
      ) : null}
    </AuthShell>
  );
}
