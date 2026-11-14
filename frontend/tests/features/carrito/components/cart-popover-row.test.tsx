import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartPopoverRow } from '@/features/carrito/components/cart-popover-row';
import { useCartStore } from '@/features/carrito/cart-store';
import type { Product } from '@/features/catalogo/catalog-api';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  name: 'Ceviche clásico',
  description: '',
  price: 32,
  rating: null,
  imageUrl: 'https://img.test/ceviche.jpg',
  available: true,
  stock: 5,
  ...overrides,
});

// The row gets its quantity from the parent, so mirror the store the way the popover does
function Live({ dish }: { dish: Product }) {
  const quantity = useCartStore((state) => state.items[0]?.quantity ?? 0);
  return quantity === 0 ? null : <CartPopoverRow product={dish} quantity={quantity} />;
}

function renderRow(dish: Product, quantity: number) {
  useCartStore.setState({ items: [{ productId: dish.id, quantity }] });
  return render(
    <MemoryRouter>
      <ul>
        <Live dish={dish} />
      </ul>
    </MemoryRouter>,
  );
}

const quantityOf = () => useCartStore.getState().items[0]?.quantity;

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null, lastRemoved: null, lastCleared: null });
});

describe('CartPopoverRow', () => {
  it('muestra imagen, nombre recortado con título, cantidad y botones con nombre', () => {
    renderRow(product(), 2);

    expect(screen.getByRole('img', { name: 'Ceviche clásico' })).toHaveAttribute('src', 'https://img.test/ceviche.jpg');
    const name = screen.getByText('Ceviche clásico');
    expect(name).toHaveClass('truncate');
    expect(name).toHaveAttribute('title', 'Ceviche clásico');
    expect(screen.getByRole('status', { name: 'Cantidad de Ceviche clásico' })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Quitar una unidad de Ceviche clásico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar una unidad de Ceviche clásico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar Ceviche clásico del carrito' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('muestra el precio unitario del plato', () => {
    renderRow(product({ price: 32 }), 2);

    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
  });

  it('+ suma y − resta una unidad', async () => {
    renderRow(product(), 2);

    await userEvent.click(screen.getByRole('button', { name: 'Agregar una unidad de Ceviche clásico' }));
    expect(quantityOf()).toBe(3);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Ceviche clásico' }));
    expect(quantityOf()).toBe(2);
  });

  it('con la cantidad igual al stock deshabilita +', () => {
    renderRow(product({ stock: 2 }), 2);

    expect(screen.getByRole('button', { name: 'Agregar una unidad de Ceviche clásico' })).toBeDisabled();
  });

  it('− con 1 quita el plato y avisa', async () => {
    renderRow(product(), 1);

    await userEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Ceviche clásico' }));

    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(useCartStore.getState().lastRemoved?.name).toBe('Ceviche clásico');
  });

  it('el botón de eliminar desvanece la fila y luego quita el plato', async () => {
    renderRow(product(), 3);

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Ceviche clásico del carrito' }));

    expect(screen.getByRole('listitem')).toHaveClass('opacity-0');
    expect(useCartStore.getState().items).toHaveLength(1);
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(useCartStore.getState().lastRemoved?.name).toBe('Ceviche clásico');
  });

  it('con movimiento reducido lo quita de inmediato, sin desvanecer', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      renderRow(product(), 3);

      await userEvent.click(screen.getByRole('button', { name: 'Eliminar Ceviche clásico del carrito' }));

      expect(useCartStore.getState().items).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('los botones + y − son cuadrados: no heredan la altura mínima del botón base', () => {
    renderRow(product(), 2);

    for (const name of ['Agregar una unidad de Ceviche clásico', 'Quitar una unidad de Ceviche clásico']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('size-8', 'min-h-8!');
    }
  });

  it('un plato agotado lo indica bajo el nombre, no puede crecer y se puede quitar', async () => {
    renderRow(product({ available: false, stock: 0 }), 2);

    const note = screen.getByText('Agotado, no suma al total');
    expect(note).toHaveClass('text-error-text');
    expect(screen.getByRole('button', { name: 'Agregar una unidad de Ceviche clásico' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Ceviche clásico' }));
    expect(quantityOf()).toBe(1);
  });

  it('un plato disponible no muestra la línea de agotado', () => {
    renderRow(product(), 1);

    expect(screen.queryByText('Agotado, no suma al total')).not.toBeInTheDocument();
  });

  it('sin imagen usa la de reemplazo', () => {
    renderRow(product({ imageUrl: null }), 1);

    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toBeInTheDocument();
  });
});
