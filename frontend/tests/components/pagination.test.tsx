import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '@/components/pagination';

describe('Pagination', () => {
  it('no se muestra con una sola página', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('marca la página actual con aria-current', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Página 1' })).not.toHaveAttribute('aria-current');
  });

  it('deshabilita Anterior en la primera página y Siguiente en la última', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('llama a onPageChange con la página elegida', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 2);
  });
});
