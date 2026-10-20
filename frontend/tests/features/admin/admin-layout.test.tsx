import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import { AuthProvider } from '@/context/auth-context';
import * as categoryApi from '@/features/admin/admin-category-api';
import * as authApi from '@/features/auth/auth-api';
import { router as appRouter } from '@/router';

vi.mock('@/features/auth/auth-api');
vi.mock('@/features/admin/admin-category-api');

function renderPanel(path: string) {
  // Same route objects as the app, on an in-memory history
  const router = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  render(
    <QueryWrapper>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryWrapper>,
  );
  return router;
}

describe('Panel de administración', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authApi.me).mockResolvedValue({
      id: 1,
      email: 'admin@correo.com',
      firstName: 'Admin',
      lastName: 'Salazar',
      phone: '987654321',
      role: 'ADMINISTRADOR',
      hasPassword: true,
    });
  });

  it('/admin redirige a Platos, resaltada, sin el header de la tienda', async () => {
    const router = renderPanel('/admin');

    expect(await screen.findByRole('heading', { name: 'Platos' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/platos');
    expect(screen.getByRole('link', { name: 'Platos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Carrito' })).not.toBeInTheDocument();
  });

  it('cambiar de sección cambia la URL y el contenido', async () => {
    const user = userEvent.setup();
    const router = renderPanel('/admin/platos');
    await screen.findByRole('heading', { name: 'Platos' });

    await user.click(screen.getByRole('link', { name: 'Pedidos' }));

    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/pedidos');
    expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Platos' })).not.toHaveAttribute('aria-current');
  });

  it('la sección Categorías muestra la gestión de categorías dentro del panel', async () => {
    vi.mocked(categoryApi.listAdminCategories).mockResolvedValue({
      items: [{ id: 1, name: 'Ceviches', slug: 'ceviches', productCount: 2 }],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    renderPanel('/admin/categorias');

    expect(await screen.findByRole('heading', { name: 'Categorías' })).toBeInTheDocument();
    expect(await screen.findByText('Ceviches')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('aria-current', 'page');
  });

  it.each(['Platos', 'Pedidos', 'Reportes'])('la sección %s muestra su estado vacío', async (name) => {
    const path = { Platos: 'platos', Pedidos: 'pedidos', Reportes: 'reportes' }[name];
    renderPanel(`/admin/${path}`);

    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByText('Aún no hay nada por mostrar.')).toBeInTheDocument();
  });

  it('una sección inexistente muestra "Página no encontrada" con la navegación visible', async () => {
    renderPanel('/admin/otra');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Panel de administración' })).toBeInTheDocument();
  });

  it('un cliente no ve el panel en ninguna ruta de /admin', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 2,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
      hasPassword: true,
    });
    renderPanel('/admin/pedidos');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Panel de administración' })).not.toBeInTheDocument();
  });

  it('/admin/mi-informacion muestra los datos del administrador sin el header de la tienda', async () => {
    renderPanel('/admin/mi-informacion');

    expect(await screen.findByRole('heading', { name: 'Mi información' })).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@correo.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mi información' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Panel de administración' })).toBeInTheDocument();
  });

  it('desde "Mi información" se abren los diálogos independientes de datos y de contraseña', async () => {
    const user = userEvent.setup();
    renderPanel('/admin/mi-informacion');

    await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
    expect(screen.getByRole('dialog', { name: 'Editar datos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(screen.getByRole('dialog', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('un cliente no ve "Mi información" del panel', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 2,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
      hasPassword: true,
    });
    renderPanel('/admin/mi-informacion');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.queryByText('maria@correo.com')).not.toBeInTheDocument();
  });
});
