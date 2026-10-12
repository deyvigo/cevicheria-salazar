import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReturnPathRedirect } from '@/components/return-path-redirect';
import { rememberReturnPath } from '@/features/auth/return-path';

let currentUser: { id: number } | null = null;
vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: currentUser, isLoading: false }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReturnPathRedirect />
      <Routes>
        <Route path="/" element={<p>Inicio</p>} />
        <Route path="/cart" element={<p>Carrito</p>} />
        <Route path="/menu" element={<p>Carta</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReturnPathRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
    currentUser = null;
  });

  it('con sesión en / lleva a la pantalla guardada antes de ir a Google', async () => {
    currentUser = { id: 1 };
    rememberReturnPath('/cart');
    renderAt('/');

    expect(await screen.findByText('Carrito')).toBeInTheDocument();
  });

  it('sin sesión no navega ni consume la ruta guardada', () => {
    rememberReturnPath('/cart');
    renderAt('/');

    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(sessionStorage.getItem('salazar.return-path')).not.toBeNull();
  });

  it('con sesión y nada guardado se queda en /', () => {
    currentUser = { id: 1 };
    renderAt('/');

    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('fuera de / no hace nada', () => {
    currentUser = { id: 1 };
    rememberReturnPath('/cart');
    renderAt('/menu');

    expect(screen.getByText('Carta')).toBeInTheDocument();
  });
});
