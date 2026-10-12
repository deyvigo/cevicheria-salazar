import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartAddedNotice } from '@/features/carrito/components/cart-added-notice';
import { useCartStore } from '@/features/carrito/cart-store';

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderNotice() {
  return render(
    <MemoryRouter>
      <CartAddedNotice />
    </MemoryRouter>,
  );
}

describe('CartAddedNotice', () => {
  it('no muestra nada antes de agregar', () => {
    renderNotice();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa con enlace a /cart y se cierra a los 4 segundos', () => {
    vi.useFakeTimers();
    renderNotice();

    act(() => useCartStore.getState().add({ id: 1, name: 'Ceviche clásico', available: true, stock: 5 }));

    expect(screen.getByText('Agregamos Ceviche clásico a tu carrito')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver carrito' })).toHaveAttribute('href', '/cart');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Agregamos Ceviche clásico a tu carrito')).not.toBeInTheDocument();
  });

  it('se cierra con el botón', async () => {
    const user = userEvent.setup();
    renderNotice();
    act(() => useCartStore.getState().add({ id: 1, name: 'Ceviche', available: true, stock: 5 }));

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByText('Agregamos Ceviche a tu carrito')).not.toBeInTheDocument();
  });
});
