import { describe, expect, it } from 'vitest';
import { isAuthPath, safeNextPath } from '../navigation';

describe('navigation', () => {
  it('acepta rutas internas y conserva query y hash', () => {
    expect(safeNextPath('/compras?estado=pending#detalle')).toBe('/compras?estado=pending#detalle');
  });

  it('rechaza destinos externos', () => {
    expect(safeNextPath('https://example.com')).toBe('/');
    expect(safeNextPath('//example.com')).toBe('/');
  });

  it('rechaza volver a rutas de autenticación', () => {
    expect(safeNextPath('/ingresar?next=/compras')).toBe('/');
    expect(safeNextPath('/registro')).toBe('/');
  });

  it('reconoce rutas de autenticación', () => {
    expect(isAuthPath('/ingresar')).toBe(true);
    expect(isAuthPath('/ingresar/google')).toBe(true);
    expect(isAuthPath('/ingresarx')).toBe(false);
  });
});
