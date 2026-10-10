import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { Layout } from '@/components/layout';

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn() }),
}));

function GoWithLoggedOut() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/', { state: { loggedOut: true } })}>cerrar</button>;
}

function renderLayout(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryWrapper>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<GoWithLoggedOut />} />
          </Route>
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('muestra el aviso "Cerraste sesión" al llegar tras cerrar sesión', () => {
    renderLayout({ pathname: '/', state: { loggedOut: true } });

    expect(screen.getByRole('status')).toHaveTextContent('Cerraste sesión');
  });

  it('no muestra el aviso en una visita normal', () => {
    renderLayout('/');

    expect(screen.queryByText('Cerraste sesión')).not.toBeInTheDocument();
  });

  it('muestra el aviso aunque el layout ya esté montado cuando se navega con el estado', async () => {
    renderLayout('/');

    await userEvent.click(screen.getByRole('button', { name: 'cerrar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Cerraste sesión');
  });
});
