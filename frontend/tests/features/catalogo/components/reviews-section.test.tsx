import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';
import * as catalogApi from '@/features/catalogo/catalog-api';
import type { Review } from '@/features/catalogo/catalog-api';
import { ReviewsSection } from '@/features/catalogo/components/reviews-section';

vi.mock('@/features/auth/auth-api');
vi.mock('@/features/catalogo/catalog-api');

const CUSTOMER = {
  id: 1,
  email: 'ana@correo.com',
  firstName: 'Ana',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE' as const,
  hasPassword: true,
};

const MINE: Review = {
  id: 9,
  authorName: 'Ana',
  rating: 4,
  comment: 'Muy rico',
  createdAt: '2026-11-10T10:00:00Z',
  edited: false,
};

function renderSection(rating: number | null = 4.5, reviewCount = 2) {
  return render(
    <QueryWrapper>
      <MemoryRouter>
        <ReviewsSection productId={7} rating={rating} reviewCount={reviewCount} />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

beforeEach(() => {
  vi.mocked(authApi.me).mockReset();
  vi.mocked(catalogApi.getReviews).mockReset().mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
  vi.mocked(catalogApi.getMyReview).mockReset();
  vi.mocked(catalogApi.saveMyReview).mockReset();
  vi.mocked(catalogApi.deleteMyReview).mockReset();
});

describe('ReviewsSection', () => {
  it('los filtros piden las reseñas según la calificación y marcan el activo', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    renderSection();

    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Negativas' }));

    expect(screen.getByRole('button', { name: 'Negativas' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(catalogApi.getReviews).toHaveBeenLastCalledWith(7, 1, 'negative'));
    expect(await screen.findByText('No hay reseñas de este tipo.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Positivas' }));
    await waitFor(() => expect(catalogApi.getReviews).toHaveBeenLastCalledWith(7, 1, 'positive'));
    await user.click(screen.getByRole('button', { name: 'Neutras' }));
    await waitFor(() => expect(catalogApi.getReviews).toHaveBeenLastCalledWith(7, 1, 'neutral'));
  });

  it('sin reseñas no muestra los filtros', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    renderSection(null, 0);

    expect(await screen.findByText('Aún no hay reseñas.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filtrar reseñas' })).not.toBeInTheDocument();
  });

  it('un visitante ve el resumen y el enlace para iniciar sesión, sin formulario', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    renderSection();

    expect(screen.getByText('4.5 · 2 reseñas')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Inicia sesión para dejar tu reseña' })).toHaveAttribute(
      'href',
      '/iniciar-sesion',
    );
    expect(screen.queryByRole('button', { name: 'Escribir reseña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(catalogApi.getMyReview).not.toHaveBeenCalled();
  });

  it('un cliente que no compró el plato no ve el botón ni ningún aviso', async () => {
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: false, review: null });
    renderSection();

    await waitFor(() => expect(catalogApi.getMyReview).toHaveBeenCalled());
    expect(await screen.findByText('Aún no hay reseñas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escribir reseña' })).not.toBeInTheDocument();
    expect(screen.queryByText(/ya compraste/)).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('con derecho a reseñar exige la calificación, el comentario es opcional y publica', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: true, review: null });
    vi.mocked(catalogApi.saveMyReview).mockResolvedValue(MINE);
    renderSection();

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Escribir reseña' }));
    expect(screen.getByRole('dialog', { name: 'Deja tu reseña' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publicar reseña' }));
    expect(await screen.findByText('Elige una calificación de 1 a 5.')).toBeInTheDocument();
    expect(catalogApi.saveMyReview).not.toHaveBeenCalled();

    await user.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await user.click(screen.getByRole('button', { name: 'Publicar reseña' }));

    await waitFor(() => expect(catalogApi.saveMyReview).toHaveBeenCalledWith(7, { rating: 5, comment: '' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancelar cierra el diálogo sin guardar', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: true, review: null });
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Escribir reseña' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(catalogApi.saveMyReview).not.toHaveBeenCalled();
  });

  it('valida el largo máximo del comentario', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: true, review: null });
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Escribir reseña' }));
    await user.click(screen.getByRole('radio', { name: '3 estrellas' }));
    await user.click(screen.getByLabelText('Comentario (opcional)'));
    await user.paste('a'.repeat(501));
    await user.click(screen.getByRole('button', { name: 'Publicar reseña' }));

    expect(await screen.findByText('El comentario no puede superar los 500 caracteres.')).toBeInTheDocument();
    expect(catalogApi.saveMyReview).not.toHaveBeenCalled();
  });

  it('con reseña propia muestra la reseña con Editar y Eliminar, en lugar del formulario', async () => {
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: true, review: MINE });
    renderSection();

    expect(await screen.findByText('Tu reseña')).toBeInTheDocument();
    expect(screen.getByText('Muy rico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escribir reseña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('edita la reseña propia con sus valores actuales', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: true, review: MINE });
    vi.mocked(catalogApi.saveMyReview).mockResolvedValue({ ...MINE, rating: 2, edited: true });
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('dialog', { name: 'Editar tu reseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Comentario (opcional)')).toHaveValue('Muy rico');
    expect(screen.getByRole('radio', { name: '4 estrellas' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '2 estrellas' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(catalogApi.saveMyReview).toHaveBeenCalledWith(7, { rating: 2, comment: 'Muy rico' }));
  });

  it('elimina la reseña solo tras confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockResolvedValue(CUSTOMER);
    vi.mocked(catalogApi.getMyReview).mockResolvedValue({ canReview: true, review: MINE });
    vi.mocked(catalogApi.deleteMyReview).mockResolvedValue();
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(catalogApi.deleteMyReview).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Eliminar reseña' }));

    await waitFor(() => expect(catalogApi.deleteMyReview).toHaveBeenCalledWith(7));
  });

  it('sin calificación no muestra el promedio', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    renderSection(null, 0);

    expect(await screen.findByText('Aún no hay reseñas.')).toBeInTheDocument();
    expect(screen.queryByText(/reseñas$/)).not.toBeInTheDocument();
  });
});
