import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Product } from '@/features/catalogo/catalog-api';
import { ProductCard } from '@/features/catalogo/components/product-card';

const PRODUCT: Product = {
  id: 1,
  name: 'Ceviche clásico',
  description: 'Pescado fresco',
  price: 32,
  rating: 4.5,
  imageUrl: 'http://media.test/platos/ceviche.jpg',
};

describe('ProductCard', () => {
  it('muestra nombre, precio con dos decimales, calificación e imagen', () => {
    render(<ProductCard product={PRODUCT} />);

    expect(screen.getByRole('heading', { name: 'Ceviche clásico' })).toBeInTheDocument();
    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Calificación 4.5 de 5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ceviche clásico' })).toHaveAttribute('src', PRODUCT.imageUrl);
  });

  it('no muestra calificación cuando el plato no tiene', () => {
    render(<ProductCard product={{ ...PRODUCT, rating: null }} />);

    expect(screen.queryByLabelText(/calificación/i)).not.toBeInTheDocument();
  });

  it('usa la imagen de reemplazo cuando no hay imagen', () => {
    render(<ProductCard product={{ ...PRODUCT, imageUrl: null }} />);

    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toHaveAttribute('src', '/dish-placeholder.svg');
  });

  it('usa la imagen de reemplazo cuando la imagen falla al cargar', () => {
    render(<ProductCard product={PRODUCT} />);

    fireEvent.error(screen.getByRole('img', { name: 'Ceviche clásico' }));

    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toHaveAttribute('src', '/dish-placeholder.svg');
  });
});
