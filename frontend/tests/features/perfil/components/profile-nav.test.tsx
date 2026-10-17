import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/features/auth/auth-api';
import { ProfileNav } from '@/features/perfil/components/profile-nav';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/auth/auth-api');

function renderNav(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <QueryWrapper>
        <Routes>
          <Route path="/perfil/*" element={<ProfileNav />} />
          <Route path="/" element={<p>Inicio</p>} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  );
}

describe('ProfileNav', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra "Mi información" con su ruta y la marca como actual', () => {
    renderNav('/perfil/mi-informacion');

    const link = screen.getByRole('link', { name: 'Mi información' });
    expect(link).toHaveAttribute('href', '/perfil/mi-informacion');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('no marca la sección en otra ruta', () => {
    renderNav('/perfil/otra');

    expect(screen.getByRole('link', { name: 'Mi información' })).not.toHaveAttribute('aria-current');
  });

  it('"Cerrar sesión" cierra la sesión y lleva a la tienda', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.logout).mockResolvedValue();
    renderNav('/perfil/mi-informacion');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByText('Inicio')).toBeInTheDocument();
  });

  it('si el cierre falla muestra el error y se queda en el perfil', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.logout).mockRejectedValue(new Error('network'));
    renderNav('/perfil/mi-informacion');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByText('No pudimos cerrar tu sesión')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mi información' })).toBeInTheDocument();
  });
});
