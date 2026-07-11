import { getToken } from './tokenStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/**
 * FastAPI devuelve el objeto plano (no hay sobre { success, data }) y reporta los
 * errores como { detail }, donde `detail` es un string o —en los 422 de Pydantic—
 * una lista de problemas de validación. Este cliente habla ese idioma.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ValidationIssue {
  msg: string;
  loc?: (string | number)[];
}

function mensajeDeError(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === 'string') return detail;

  // 422 de Pydantic: [{ loc: ['body','email'], msg: '...' }, ...]
  if (Array.isArray(detail)) {
    const msgs = (detail as ValidationIssue[]).map((d) => d.msg).filter(Boolean);
    if (msgs.length) return msgs.join('. ');
  }

  return `Error del servidor (${status}).`;
}

async function request<T>(
  path: string,
  options: RequestInit,
  explicitToken?: string,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const token = explicitToken ?? (await getToken());

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });
  } catch {
    // fetch solo rechaza si la red falló: el backend está caído o la IP del .env
    // no es alcanzable desde el dispositivo.
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  }

  // 204 y respuestas vacías no traen JSON que parsear.
  const texto = await res.text();
  let body: unknown = null;
  if (texto) {
    try {
      body = JSON.parse(texto);
    } catch {
      if (!res.ok) throw new ApiError(`Error del servidor (${res.status}).`, res.status);
    }
  }

  if (!res.ok) {
    throw new ApiError(mensajeDeError(body, res.status), res.status, body);
  }

  return body as T;
}

export const http = {
  get: <T>(path: string, token?: string): Promise<T> =>
    request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: unknown, token?: string): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string): Promise<T> =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
  delete: <T>(path: string, token?: string): Promise<T> =>
    request<T>(path, { method: 'DELETE' }, token),
  postForm: <T>(path: string, formData: FormData, token?: string): Promise<T> =>
    request<T>(path, { method: 'POST', body: formData }, token),
};

export default http;
