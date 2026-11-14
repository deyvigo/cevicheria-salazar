import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as cartApi from '@/features/carrito/cart-api';
import { CartLink } from '@/features/carrito/components/cart-link';
import { useCartStore } from '@/features/carrito/cart-store';

vi.mock('@/features/carrito/cart-api');

function renderLink(entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryWrapper>
        <CartLink />
      </QueryWrapper>
    </MemoryRouter>,
  );
}

const card = () => screen.queryByRole('region', { name: 'Resumen del carrito' });

beforeEach(() => {
  vi.mocked(cartApi.getProductsByIds)
    .mockReset()
    .mockResolvedValue([
      { id: 1, name: 'Plato 1', description: '', price: 10, rating: null, imageUrl: null, available: true, stock: 5 },
    ]);
  localStorage.clear();
  useCartStore.setState({ items: [{ productId: 1, quantity: 1 }], lastAdded: null, lastRemoved: null, lastCleared: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CartLink', () => {
  it('no pide platos ni muestra la tarjeta sin hover', () => {
    renderLink();

    expect(card()).not.toBeInTheDocument();
    expect(cartApi.getProductsByIds).not.toHaveBeenCalled();
  });

  it('abre la tarjeta al pasar el cursor, con aria-expanded', async () => {
    renderLink();
    const link = screen.getByRole('link', { name: 'Carrito, 1 producto' });

    expect(link).toHaveAttribute('aria-expanded', 'false');
    await userEvent.hover(link);

    expect(card()).toBeInTheDocument();
    expect(await screen.findByText('Plato 1')).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-expanded', 'true');
  });

  it('el clic en el ícono sigue enlazando a /cart', () => {
    renderLink();

    expect(screen.getByRole('link', { name: 'Carrito, 1 producto' })).toHaveAttribute('href', '/cart');
  });

  it('pasar del ícono a la tarjeta no la cierra; salir de ambos la cierra tras el retardo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderLink();
    const link = screen.getByRole('link', { name: 'Carrito, 1 producto' });

    await userEvent.hover(link);
    await userEvent.unhover(link);
    await userEvent.hover(card()!);
    act(() => void vi.advanceTimersByTime(500));
    expect(card()).toBeInTheDocument();

    await userEvent.unhover(card()!);
    act(() => void vi.advanceTimersByTime(300));
    expect(card()).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(150));
    expect(card()).not.toBeInTheDocument();
  });

  it('volver a entrar antes del retardo la mantiene abierta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderLink();
    const link = screen.getByRole('link', { name: 'Carrito, 1 producto' });

    await userEvent.hover(link);
    await userEvent.unhover(link);
    act(() => void vi.advanceTimersByTime(300));
    await userEvent.hover(link);
    act(() => void vi.advanceTimersByTime(500));

    expect(card()).toBeInTheDocument();
  });

  it('con el foco de teclado se abre y Escape la cierra devolviendo el foco al ícono', async () => {
    renderLink();

    await userEvent.tab();
    const link = screen.getByRole('link', { name: 'Carrito, 1 producto' });
    expect(link).toHaveFocus();
    expect(card()).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Quitar una unidad de Plato 1' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');

    expect(card()).not.toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  it('al sacar el foco de todo el contenedor se cierra', async () => {
    render(
      <MemoryRouter>
        <QueryWrapper>
          <CartLink />
          <button>Fuera</button>
        </QueryWrapper>
      </MemoryRouter>,
    );

    await userEvent.tab();
    expect(card()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fuera' }));

    expect(card()).not.toBeInTheDocument();
  });

  it.each(['/cart', '/checkout/direcciones', '/checkout/pago'])('en %s no muestra la tarjeta', async (path) => {
    renderLink(path);
    const link = screen.getByRole('link', { name: 'Carrito, 1 producto' });

    await userEvent.hover(link);

    expect(card()).not.toBeInTheDocument();
    expect(link).not.toHaveAttribute('aria-expanded');
    expect(link).toHaveAttribute('href', '/cart');
  });

  it('cambiar desde la tarjeta actualiza la insignia', async () => {
    renderLink();
    await userEvent.hover(screen.getByRole('link', { name: 'Carrito, 1 producto' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar una unidad de Plato 1' }));
    expect(screen.getByRole('link', { name: 'Carrito, 1 producto' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Vaciar carrito' }));
    expect(screen.getByRole('link', { name: 'Carrito' })).toBeInTheDocument();
  });
});
