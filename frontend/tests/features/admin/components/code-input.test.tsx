import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { CodeInput } from '@/features/admin/components/code-input';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <>
      <CodeInput label="Código" length={4} value={value} onChange={setValue} />
      <p data-testid="value">{value}</p>
    </>
  );
}

describe('CodeInput', () => {
  it('muestra una casilla por dígito y avanza al escribir', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getAllByLabelText(/Dígito \d de 4/)).toHaveLength(4);
    await user.type(screen.getByLabelText('Dígito 1 de 4'), '1234');

    expect(screen.getByTestId('value')).toHaveTextContent('1234');
    expect(screen.getByLabelText('Dígito 4 de 4')).toHaveValue('4');
  });

  it('ignora lo que no son dígitos', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Dígito 1 de 4'), 'a1b2');

    expect(screen.getByTestId('value')).toHaveTextContent('12');
  });

  it('borra hacia atrás con Retroceso', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Dígito 1 de 4'), '12');
    await user.keyboard('{Backspace}');
    expect(screen.getByTestId('value')).toHaveTextContent('1');
  });

  it('rellena las casillas al pegar el código', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Dígito 1 de 4'));
    await user.paste('4827');

    expect(screen.getByTestId('value')).toHaveTextContent('4827');
  });
});
