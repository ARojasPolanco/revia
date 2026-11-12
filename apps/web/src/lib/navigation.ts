export const AUTH_PATHS = ['/ingresar', '/registro', '/recuperar', '/verificar-email'] as const;

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) {
    return fallback;
  }

  try {
    const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(value, base);

    if (url.origin !== base || isAuthPath(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
