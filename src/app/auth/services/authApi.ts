import http from '@/services/http';

import type { LoginPayload, RegisterPayload, TokenResponse } from '../types/auth';

export function login(payload: LoginPayload): Promise<TokenResponse> {
  return http.post<TokenResponse>('/api/auth/login', payload);
}

/** Self-signup: el backend fuerza role='investor', no viaja en el body. */
export function register(payload: RegisterPayload): Promise<TokenResponse> {
  return http.post<TokenResponse>('/api/auth/register', payload);
}
