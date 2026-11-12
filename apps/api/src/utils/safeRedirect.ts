const AUTH_REDIRECT_PATHS = ['/ingresar', '/registro', '/recuperar', '/verificar-email'];

export function safeRedirectPath(value: unknown, base: string): string {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/';
  }

  try {
    const baseUrl = new URL(base);
    const url = new URL(value, baseUrl);

    if (url.origin !== baseUrl.origin) {
      return '/';
    }

    const blocked = AUTH_REDIRECT_PATHS.some(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
    );

    return blocked ? '/' : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
