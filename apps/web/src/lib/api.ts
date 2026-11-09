const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verificá que la API esté corriendo.',
      0
    );
  }

  const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Error de red', response.status);
  }

  return payload;
}
