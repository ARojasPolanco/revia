import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InfoTooltip } from '../InfoTooltip';

describe('InfoTooltip', () => {
  it('abre el tooltip al hacer click', () => {
    render(<InfoTooltip text="Acepta CBU o CVU" />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Más información' }));

    expect(screen.getByRole('tooltip')).toHaveTextContent('Acepta CBU o CVU');
  });

  it('abre el tooltip al pasar el mouse', () => {
    render(<InfoTooltip text="Acepta CBU o CVU" />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Más información' }));

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
