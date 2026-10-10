import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductGrid } from '@/features/catalogo/components/product-grid';

const PRODUCTS = [
  { id: 1, name: 'Ceviche clásico', description: '', price: 32, rating: null, imageUrl: null },
  { id: 2, name: 'Ceviche mixto', description: '', price: 35, rating: 4, imageUrl: null },
];

describe('ProductGrid', () => {
  it('muestra una tarjeta por plato', () => {
    render(<ProductGrid products={PRODUCTS} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('muestra "No se encontraron productos" cuando no hay platos', () => {
    render(<ProductGrid products={[]} />);

    expect(screen.getByText('No se encontraron productos.')).toBeInTheDocument();
  });

  it('no muestra el mensaje vacío mientras carga', () => {
    render(<ProductGrid products={[]} isLoading />);

    expect(screen.queryByText('No se encontraron productos.')).not.toBeInTheDocument();
  });
});
