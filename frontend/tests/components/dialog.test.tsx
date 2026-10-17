import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/components/dialog';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Dialog
        open={open}
        title="Editar"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <input aria-label="Campo" />
        <button>Aceptar</button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('no renderiza nada cerrado y muestra título y contenido abierto', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('dialog', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Campo')).toHaveFocus();
  });

  it('se cierra con Escape y devuelve el foco al disparador', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });

  it('se cierra al tocar el fondo pero no al tocar el contenido', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tiene una X que cierra el diálogo', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mantiene el foco dentro con Tab', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    await user.tab();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Campo')).toHaveFocus();
  });
});
