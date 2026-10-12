import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Notification } from '@/components/notification';

describe('Notification', () => {
  it('muestra el título sin acción por defecto', () => {
    render(<Notification variant="success" title="Listo" />);

    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('pinta la acción cuando se pasa', () => {
    render(<Notification variant="success" title="Listo" action={<a href="/cart">Ver carrito</a>} />);

    expect(screen.getByRole('link', { name: 'Ver carrito' })).toBeInTheDocument();
  });
});
