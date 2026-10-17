import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminSessionContext } from '@/features/admin/admin-session';
import { AdminNav } from '@/features/admin/components/admin-nav';

function renderNav(path: string, signOut = vi.fn().mockResolvedValue(undefined)) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSessionContext.Provider value={{ signOut }}>
        <AdminNav />
      </AdminSessionContext.Provider>
    </MemoryRouter>,
  );
  return { signOut };
}

describe('AdminNav', () => {
  it('lista las cuatro secciones con su ruta', () => {
    renderNav('/admin/platos');

    const nav = screen.getByRole('navigation', { name: 'Panel de administración' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Platos' })).toHaveAttribute('href', '/admin/platos');
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/admin/categorias');
    expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/admin/pedidos');
    expect(screen.getByRole('link', { name: 'Reportes' })).toHaveAttribute('href', '/admin/reportes');
  });

  it('marca solo la sección actual con aria-current', () => {
    renderNav('/admin/pedidos');

    expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Platos' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Reportes' })).not.toHaveAttribute('aria-current');
  });

  it('muestra el título y se pliega y expande con el botón', async () => {
    const user = userEvent.setup();
    renderNav('/admin/platos');
    expect(screen.getByText('Administrador')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Contraer menú' }));

    expect(screen.queryByText('Administrador')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Platos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expandir menú' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Expandir menú' }));

    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('ya no ofrece ir a la tienda', () => {
    renderNav('/admin/platos');

    expect(screen.queryByRole('link', { name: 'Ir a la tienda' })).not.toBeInTheDocument();
  });

  it('"Cerrar sesión" llama a signOut', async () => {
    const user = userEvent.setup();
    const { signOut } = renderNav('/admin/platos');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(signOut).toHaveBeenCalledOnce();
  });

  it('si el cierre falla muestra el error', async () => {
    const user = userEvent.setup();
    renderNav('/admin/platos', vi.fn().mockRejectedValue(new Error('red caída')));

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cerrar tu sesión');
  });
});
