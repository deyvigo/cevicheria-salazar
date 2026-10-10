import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
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

function Probe() {
  const location = useLocation();
  return <p data-testid="probe">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderCard(product: Product) {
  const router = createMemoryRouter(
    [
      { path: '/ceviches', element: <ProductCard product={product} /> },
      { path: '/products/:id', element: <Probe /> },
    ],
    { initialEntries: ['/ceviches?page=2'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('ProductCard', () => {
  it('muestra nombre, precio con dos decimales, calificación e imagen', () => {
    renderCard(PRODUCT);

    expect(screen.getByRole('heading', { name: 'Ceviche clásico' })).toBeInTheDocument();
    expect(screen.getByText('S/ 32.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Calificación 4.5 de 5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ceviche clásico' })).toHaveAttribute('src', PRODUCT.imageUrl);
  });

  it('no muestra calificación cuando el plato no tiene', () => {
    renderCard({ ...PRODUCT, rating: null });

    expect(screen.queryByLabelText(/calificación/i)).not.toBeInTheDocument();
  });

  it('usa la imagen de reemplazo cuando no hay imagen', () => {
    renderCard({ ...PRODUCT, imageUrl: null });

    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toHaveAttribute('src', '/dish-placeholder.svg');
  });

  it('usa la imagen de reemplazo cuando la imagen falla al cargar', () => {
    renderCard(PRODUCT);

    fireEvent.error(screen.getByRole('img', { name: 'Ceviche clásico' }));

    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toHaveAttribute('src', '/dish-placeholder.svg');
  });

  it('es un enlace al detalle que recuerda de qué listado viene y se activa con Enter', async () => {
    const user = userEvent.setup();
    renderCard(PRODUCT);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/1');

    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(await screen.findByTestId('probe')).toHaveTextContent('/products/1 {"from":"/ceviches?page=2"}');
  });

  it('no asigna nombres de transición mientras no hay navegación', () => {
    const { container } = renderCard(PRODUCT);

    expect(container.querySelector('[style*="view-transition-name"]')).toBeNull();
  });
});
