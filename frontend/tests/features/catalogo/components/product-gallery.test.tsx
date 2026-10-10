import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProductGallery } from '@/features/catalogo/components/product-gallery';

describe('ProductGallery', () => {
  it('no muestra miniaturas con una sola imagen', () => {
    render(<ProductGallery images={['http://m/a.jpg']} name="Ceviche" transitioning={false} />);

    expect(screen.getByRole('img', { name: 'Ceviche' })).toHaveAttribute('src', 'http://m/a.jpg');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra una miniatura por imagen y cambia la principal al hacer clic', async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={['http://m/a.jpg', 'http://m/b.jpg']} name="Ceviche" transitioning={false} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Ceviche' })).toHaveAttribute('src', 'http://m/a.jpg');

    await user.click(screen.getByRole('button', { name: 'Ver imagen 2' }));

    expect(screen.getByRole('img', { name: 'Ceviche' })).toHaveAttribute('src', 'http://m/b.jpg');
    expect(screen.getByRole('button', { name: 'Ver imagen 2' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('usa la imagen de reemplazo sin imágenes o cuando la imagen falla', () => {
    const { rerender } = render(<ProductGallery images={[]} name="Ceviche" transitioning={false} />);
    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toHaveAttribute('src', '/dish-placeholder.svg');

    rerender(<ProductGallery images={['http://m/a.jpg']} name="Ceviche" transitioning={false} />);
    fireEvent.error(screen.getByRole('img', { name: 'Ceviche' }));
    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toBeInTheDocument();
  });

  it('nombra la imagen principal para la transición solo mientras navega', () => {
    const { rerender } = render(<ProductGallery images={['http://m/a.jpg']} name="Ceviche" transitioning />);
    expect(screen.getByRole('img', { name: 'Ceviche' })).toHaveStyle({ viewTransitionName: 'product-image' });

    rerender(<ProductGallery images={['http://m/a.jpg']} name="Ceviche" transitioning={false} />);
    expect(screen.getByRole('img', { name: 'Ceviche' }).getAttribute('style') ?? '').not.toContain('view-transition');
  });
});
