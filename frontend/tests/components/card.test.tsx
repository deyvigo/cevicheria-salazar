import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '@/components/card';

describe('Card', () => {
  it('renderiza su contenido', () => {
    render(<Card>Ceviche clásico</Card>);

    expect(screen.getByText('Ceviche clásico')).toBeInTheDocument();
  });
});
