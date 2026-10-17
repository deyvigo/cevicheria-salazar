import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import { MyInformationPage } from '@/features/perfil/my-information-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/auth/auth-api');

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
  hasPassword: true,
};

function renderPage() {
  render(
    <QueryWrapper>
      <AuthProvider>
        <MyInformationPage />
      </AuthProvider>
    </QueryWrapper>,
  );
}

describe('MyInformationPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra nombres, apellidos, teléfono y correo', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    renderPage();

    expect(await screen.findByText('María')).toBeInTheDocument();
    expect(screen.getByText('Quispe')).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();
    expect(screen.getByText('maria@correo.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('muestra "No registrado" sin teléfono y "Crear contraseña" sin contraseña', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ ...maria, phone: null as unknown as string, hasPassword: false });
    renderPage();

    expect(await screen.findByText('No registrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear contraseña' })).toBeInTheDocument();
  });
});
