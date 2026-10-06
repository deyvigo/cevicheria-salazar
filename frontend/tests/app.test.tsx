import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '@/app';

describe('App', () => {
  it('muestra el nombre del negocio', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Salazar SAC')).toBeInTheDocument();
  });

  it('muestra el aviso "Cerraste sesión" cuando se llega tras cerrar sesión', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: { loggedOut: true } }]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Cerraste sesión');
  });

  it('no muestra el aviso en una visita normal', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Cerraste sesión')).not.toBeInTheDocument();
  });

  it('muestra el aviso aunque App ya esté montada cuando se navega a / con el estado', async () => {
    function GoWithLoggedOut() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/', { state: { loggedOut: true } })}>cerrar</button>;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <GoWithLoggedOut />
        <App />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Cerraste sesión')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'cerrar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Cerraste sesión');
  });
});
