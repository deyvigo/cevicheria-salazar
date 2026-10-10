import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CategoryList } from '@/features/catalogo/components/category-list';

const CATEGORIES = [
  { id: 1, name: 'Entradas', slug: 'entradas' },
  { id: 2, name: 'Ceviches', slug: 'ceviches' },
];

function renderList(activeSlug?: string, searchTerm?: string) {
  return render(
    <MemoryRouter>
      <CategoryList categories={CATEGORIES} activeSlug={activeSlug} searchTerm={searchTerm} />
    </MemoryRouter>,
  );
}

describe('CategoryList', () => {
  it('enlaza cada categoría a su slug', () => {
    renderList('entradas');

    expect(screen.getByRole('link', { name: 'Ceviches' })).toHaveAttribute('href', '/ceviches');
  });

  it('resalta solo la categoría activa', () => {
    renderList('ceviches');

    expect(screen.getByRole('link', { name: 'Ceviches' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Entradas' })).not.toHaveAttribute('aria-current');
  });

  it('no resalta ninguna con un slug desconocido', () => {
    renderList('pizzas');

    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });

  it('pone "Todos" primero, apuntando a / y resaltado cuando no hay categoría', () => {
    renderList();

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('Todos');
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[0]).toHaveAttribute('aria-current', 'page');
  });

  it('no resalta "Todos" cuando hay una categoría activa', () => {
    renderList('ceviches');

    expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current');
  });

  it('no resalta "Todos" con un slug desconocido', () => {
    renderList('pizzas');

    expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current');
  });

  it('conserva el término de búsqueda en todos los enlaces', () => {
    renderList(undefined, 'ceviche mixto');

    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/?q=ceviche+mixto');
    expect(screen.getByRole('link', { name: 'Ceviches' })).toHaveAttribute('href', '/ceviches?q=ceviche+mixto');
  });
});
