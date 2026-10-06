import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/input';

describe('Input', () => {
  it('un input normal no tiene toggle de mostrar/ocultar', () => {
    render(<Input label="Correo" name="email" type="email" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('un input de contraseña empieza oculto y el toggle lo muestra y vuelve a ocultar', async () => {
    const user = userEvent.setup();
    render(<Input label="Contraseña" name="password" type="password" />);

    const field = screen.getByLabelText('Contraseña');
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(field).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('el toggle no envía el formulario al hacer click', () => {
    render(<Input label="Contraseña" name="password" type="password" />);

    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveAttribute('type', 'button');
  });
});
