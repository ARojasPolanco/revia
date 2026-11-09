import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerifiedBadge } from '../VerifiedBadge';

describe('VerifiedBadge', () => {
  it('muestra el texto de perfil verificado', () => {
    render(<VerifiedBadge />);
    expect(screen.getByText('Perfil verificado')).toBeInTheDocument();
  });
});
