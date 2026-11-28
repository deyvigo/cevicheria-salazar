import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/button';
import { buttonClassName } from '@/components/button-class-name';

describe('Button', () => {
  it.each(['primary', 'secondary', 'outline'] as const)('usa las mismas clases que buttonClassName (%s)', (variant) => {
    render(<Button variant={variant}>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass(...buttonClassName(variant).split(' '));
  });

  it('agrega las clases propias y por defecto es primario', () => {
    render(<Button className="w-full">Pagar</Button>);

    const button = screen.getByRole('button', { name: 'Pagar' });
    expect(button).toHaveClass('w-full', 'bg-action');
  });
});
