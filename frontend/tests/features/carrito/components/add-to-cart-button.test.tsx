import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AddToCartButton } from '@/features/carrito/components/add-to-cart-button';
import { useCartStore } from '@/features/carrito/cart-store';

const product = { id: 1, name: 'Ceviche clásico', available: true, stock: 2 };

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null, lastRemoved: null });
});

describe('AddToCartButton', () => {
  it('suma 1 al hacer clic y se deshabilita al llegar al stock', async () => {
    const user = userEvent.setup();
    render(<AddToCartButton product={product} label="Agregar al carrito" />);
    const button = screen.getByRole('button', { name: 'Agregar al carrito' });

    await user.click(button);
    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 1 }]);
    expect(button).toBeEnabled();

    await user.click(button);
    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 2 }]);
    expect(button).toBeDisabled();
  });

  it.each([
    ['agotado', { ...product, available: false }],
    ['stock 0', { ...product, stock: 0 }],
    ['disponibilidad sin confirmar', { ...product, available: null, stock: null }],
    ['sin datos', null],
  ])('está deshabilitado con %s', (_name, value) => {
    render(<AddToCartButton product={value} label="Agregar al carrito" />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('el botón corto incluye el plato en su nombre accesible', () => {
    render(<AddToCartButton product={product} label="Agregar" />);

    expect(
      screen.getByRole('button', {
        name: 'Agregar Ceviche clásico al carrito',
      }),
    ).toBeInTheDocument();
  });

  it('agrega la cantidad indicada, recortada al stock', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AddToCartButton product={{ ...product, stock: 5 }} label="Agregar al carrito" quantity={3} />,
    );

    await user.click(screen.getByRole('button'));
    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 3 }]);

    rerender(<AddToCartButton product={{ ...product, stock: 5 }} label="Agregar al carrito" quantity={9} />);
    await user.click(screen.getByRole('button'));
    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 5 }]);
  });
});
