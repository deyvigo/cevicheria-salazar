import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProductGrid } from '@/features/catalogo/components/product-grid';

const PRODUCTS = [
  { id: 1, name: 'Ceviche clásico', description: '', price: 32, rating: null, imageUrl: null },
  { id: 2, name: 'Ceviche mixto', description: '', price: 35, rating: 4, imageUrl: null },
];

function renderGrid(props: Parameters<typeof ProductGrid>[0]) {
  const router = createMemoryRouter([{ path: '/', element: <ProductGrid {...props} /> }]);
  return render(<RouterProvider router={router} />);
}

describe('ProductGrid', () => {
  it('muestra una tarjeta por plato', () => {
    renderGrid({ products: PRODUCTS });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('muestra "No se encontraron productos" cuando no hay platos', () => {
    renderGrid({ products: [] });

    expect(screen.getByText('No se encontraron productos.')).toBeInTheDocument();
  });

  it('no muestra el mensaje vacío mientras carga', () => {
    renderGrid({ products: [], isLoading: true });

    expect(screen.queryByText('No se encontraron productos.')).not.toBeInTheDocument();
  });
});
