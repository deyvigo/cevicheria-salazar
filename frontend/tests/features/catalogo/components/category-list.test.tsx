import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CategoryList } from '@/features/catalogo/components/category-list';

const CATEGORIES = [
  { id: 1, name: 'Entradas', slug: 'entradas' },
  { id: 2, name: 'Ceviches', slug: 'ceviches' },
];

function renderList(activeSlug?: string) {
  return render(
    <MemoryRouter>
      <CategoryList categories={CATEGORIES} activeSlug={activeSlug} />
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
});
