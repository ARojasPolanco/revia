import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ZoomableImage } from '../ZoomableImage';

describe('ZoomableImage', () => {
  it('abre y cierra el visor ampliado', () => {
    render(<ZoomableImage src="/1.jpeg" alt="Foto de prueba" />);

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar imagen' }));

    const dialog = screen.getByRole('dialog', { name: 'Imagen ampliada' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByAltText('Foto de prueba')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
