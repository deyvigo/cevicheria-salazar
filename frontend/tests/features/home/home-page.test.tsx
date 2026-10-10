import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '@/features/home/home-page';

describe('HomePage', () => {
  it('no muestra contenido por ahora', () => {
    render(<HomePage />);

    expect(screen.getByRole('main')).toBeEmptyDOMElement();
  });
});
