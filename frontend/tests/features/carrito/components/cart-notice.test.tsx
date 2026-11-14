import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartNotice } from '@/features/carrito/components/cart-notice';
import { useCartStore } from '@/features/carrito/cart-store';

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null, lastRemoved: null, lastCleared: null });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderNotice() {
  return render(
    <MemoryRouter>
      <CartNotice />
    </MemoryRouter>,
  );
}

describe('CartNotice', () => {
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
      vi.advanceTimersByTime(2000);
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

  it('avisa al quitar un plato, sin acción', () => {
    renderNotice();
    act(() => useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] }));

    act(() => useCartStore.getState().remove(1, 'Ceviche'));

    expect(screen.getByText('Quitamos Ceviche de tu carrito')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver carrito' })).not.toBeInTheDocument();
  });

  it('no avisa al cambiar la cantidad sin quitar', () => {
    renderNotice();
    act(() => useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] }));

    act(() => useCartStore.getState().setQuantity({ id: 1, name: 'Ceviche', available: true, stock: 5 }, 3));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('el evento nuevo reemplaza al anterior', () => {
    renderNotice();
    act(() => useCartStore.getState().add({ id: 1, name: 'Ceviche', available: true, stock: 5 }));
    act(() => useCartStore.getState().remove(1, 'Ceviche'));

    expect(screen.getByText('Quitamos Ceviche de tu carrito')).toBeInTheDocument();
    expect(screen.queryByText('Agregamos Ceviche a tu carrito')).not.toBeInTheDocument();
  });

  it('avisa al vaciar el carrito, sin acción, y no al usar clear', () => {
    renderNotice();
    act(() => useCartStore.getState().add({ id: 1, name: 'Ceviche clásico', available: true, stock: 5 }));

    act(() => useCartStore.getState().emptyCart());

    expect(screen.getByText('Vaciamos tu carrito')).toBeInTheDocument();
    expect(screen.queryByText(/Agregamos/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver carrito' })).not.toBeInTheDocument();
  });

  it('clear no muestra aviso', () => {
    renderNotice();
    act(() => useCartStore.getState().add({ id: 1, name: 'Ceviche clásico', available: true, stock: 5 }));
    act(() => useCartStore.getState().remove(1, 'Ceviche clásico'));
    act(() => useCartStore.getState().clear());

    expect(screen.getByText('Quitamos Ceviche clásico de tu carrito')).toBeInTheDocument();
    expect(screen.queryByText('Vaciamos tu carrito')).not.toBeInTheDocument();
  });
});
