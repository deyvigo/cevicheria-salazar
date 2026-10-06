import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Divider } from '@/components/divider';

describe('Divider', () => {
  it('muestra el texto al centro y se expone como separador accesible', () => {
    render(<Divider>o inicia con tu correo</Divider>);

    expect(screen.getByRole('separator', { name: 'o inicia con tu correo' })).toBeInTheDocument();
    expect(screen.getByText('o inicia con tu correo')).toBeInTheDocument();
  });
});
