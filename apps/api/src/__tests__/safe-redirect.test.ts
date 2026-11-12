import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../utils/safeRedirect.js';

const base = 'https://revia.test';

describe('safeRedirectPath', () => {
  it('acepta rutas internas y conserva query y hash', () => {
    expect(safeRedirectPath('/compras?estado=pending#detalle', base)).toBe(
      '/compras?estado=pending#detalle'
    );
  });

  it('rechaza destinos externos y valores inválidos', () => {
    expect(safeRedirectPath('https://example.com', base)).toBe('/');
    expect(safeRedirectPath('//example.com', base)).toBe('/');
    expect(safeRedirectPath('/\\example.com', base)).toBe('/');
    expect(safeRedirectPath(['/compras'], base)).toBe('/');
    expect(safeRedirectPath(undefined, base)).toBe('/');
  });

  it('rechaza volver a rutas de autenticación', () => {
    expect(safeRedirectPath('/ingresar?next=/compras', base)).toBe('/');
    expect(safeRedirectPath('/registro', base)).toBe('/');
  });
});
