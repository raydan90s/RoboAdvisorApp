import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const TOKEN_KEY = 'user_token';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

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

async function request<T>(
  path: string,
  options: RequestInit,
  explicitToken?: string,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const token = explicitToken ?? (await SecureStore.getItemAsync(TOKEN_KEY));

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new ApiError(json.message ?? 'Error del servidor', res.status, json.data);
  }
  return json.data;
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
