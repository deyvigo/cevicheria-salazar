import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as catalogApi from '@/features/catalogo/catalog-api';
import type { Page, Review } from '@/features/catalogo/catalog-api';
import { ReviewList } from '@/features/catalogo/components/review-list';

vi.mock('@/features/catalogo/catalog-api');

function review(id: number, comment: string | null = `Comentario ${id}`): Review {
  return { id, authorName: 'María', rating: 4, comment, createdAt: '2026-11-10T10:00:00Z', edited: false };
}

function page(items: Review[], pageNumber: number, totalPages: number): Page<Review> {
  return { items, page: pageNumber, pageSize: 10, totalItems: 12, totalPages };
}

let trigger: () => void = () => {};

beforeEach(() => {
  vi.mocked(catalogApi.getReviews).mockReset();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        trigger = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }
      observe() {}
      disconnect() {}
    },
  );
});

describe('ReviewList', () => {
  it('sin reseñas muestra el mensaje vacío', async () => {
    vi.mocked(catalogApi.getReviews).mockResolvedValue({ ...page([], 1, 0), totalItems: 0 });
    render(<QueryWrapper><ReviewList productId={7} /></QueryWrapper>);

    expect(await screen.findByText('Aún no hay reseñas.')).toBeInTheDocument();
  });

  it('muestra autor, comentario y "editado", y omite el comentario ausente', async () => {
    vi.mocked(catalogApi.getReviews).mockResolvedValue(
      page([{ ...review(1), edited: true }, review(2, null)], 1, 1),
    );
    render(<QueryWrapper><ReviewList productId={7} /></QueryWrapper>);

    expect(await screen.findByText('Comentario 1')).toBeInTheDocument();
    expect(screen.getByText(/editado/)).toBeInTheDocument();
    expect(screen.getAllByText('María')).toHaveLength(2);
    expect(screen.getAllByRole('img', { name: '4 de 5 estrellas' })).toHaveLength(2);
  });

  it('al llegar al final pide la página siguiente y descarta reseñas repetidas', async () => {
    vi.mocked(catalogApi.getReviews)
      .mockResolvedValueOnce(page([review(3), review(2)], 1, 2))
      .mockResolvedValueOnce(page([review(2), review(1)], 2, 2));
    render(<QueryWrapper><ReviewList productId={7} /></QueryWrapper>);
    await screen.findByText('Comentario 3');

    await act(async () => trigger());

    expect(await screen.findByText('Comentario 1')).toBeInTheDocument();
    expect(catalogApi.getReviews).toHaveBeenLastCalledWith(7, 2, 'all');
    expect(screen.getAllByText('Comentario 2')).toHaveLength(1);
  });

  it('si falla la carga de más reseñas avisa y permite reintentar', async () => {
    const user = userEvent.setup();
    vi.mocked(catalogApi.getReviews)
      .mockResolvedValueOnce(page([review(2)], 1, 2))
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValueOnce(page([review(1)], 2, 2));
    render(<QueryWrapper><ReviewList productId={7} /></QueryWrapper>);
    await screen.findByText('Comentario 2');

    await act(async () => trigger());
    expect(await screen.findByText('No pudimos cargar más reseñas.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Comentario 1')).toBeInTheDocument();
  });

  it('si falla la primera carga ofrece reintentar', async () => {
    vi.mocked(catalogApi.getReviews).mockRejectedValue(new Error('red'));
    render(<QueryWrapper><ReviewList productId={7} /></QueryWrapper>);

    expect(await screen.findByText('No pudimos cargar las reseñas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
