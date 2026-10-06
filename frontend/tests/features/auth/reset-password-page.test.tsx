import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';

vi.mock('@/features/auth/auth-api');

function apiError(status: number, fieldErrors: { field: string; message: string }[] = []) {
  return new AxiosError('Error', String(status), undefined, undefined, {
    status,
    data: {
      timestamp: new Date().toISOString(),
      status,
      error: 'Error',
      fieldErrors,
      message: 'Este enlace no es válido o ya venció.',
    },
  } as never);
}

function renderPage(url = '/restablecer-contrasena?token=abc') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <QueryWrapper>
        <Routes>
          <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
          <Route path="/iniciar-sesion" element={<p>Pantalla de login</p>} />
          <Route path="/olvide-contrasena" element={<p>Pantalla de olvido</p>} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin token en la URL muestra el enlace inválido y no consulta al backend', () => {
    renderPage('/restablecer-contrasena');

    expect(screen.getByText('Este enlace no es válido o ya venció.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/olvide-contrasena');
    expect(authApi.validateResetToken).not.toHaveBeenCalled();
  });

  it('con un token que el backend rechaza muestra el enlace inválido', async () => {
    vi.mocked(authApi.validateResetToken).mockRejectedValue(apiError(400));
    renderPage();

    expect(await screen.findByText('Este enlace no es válido o ya venció.')).toBeInTheDocument();
    expect(authApi.validateResetToken).toHaveBeenCalledWith('abc');
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
  });

  it('con un token válido muestra el formulario', async () => {
    vi.mocked(authApi.validateResetToken).mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
  });

  it('valida las reglas de contraseña y la coincidencia sin enviar la solicitud', async () => {
    vi.mocked(authApi.validateResetToken).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'corta');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otra');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres, con letras y números.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('en éxito envía token y contraseña (sin la confirmación) y va al login', async () => {
    vi.mocked(authApi.validateResetToken).mockResolvedValue(undefined);
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'nueva5678');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva5678');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(authApi.resetPassword).toHaveBeenCalledWith({ token: 'abc', password: 'nueva5678' });
  });

  it('si el enlace venció mientras se escribía, pasa a mostrar el enlace inválido', async () => {
    vi.mocked(authApi.validateResetToken).mockResolvedValueOnce(undefined).mockRejectedValue(apiError(400));
    vi.mocked(authApi.resetPassword).mockRejectedValue(apiError(400));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'nueva5678');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva5678');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    expect(await screen.findByText('Este enlace no es válido o ya venció.')).toBeInTheDocument();
  });

  it('muestra el error de contraseña que devuelve el backend en el campo', async () => {
    vi.mocked(authApi.validateResetToken).mockResolvedValue(undefined);
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      apiError(400, [{ field: 'password', message: 'La contraseña no puede superar los 72 caracteres.' }]),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'nueva5678');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva5678');
    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    expect(await screen.findByText('La contraseña no puede superar los 72 caracteres.')).toBeInTheDocument();
  });
});
