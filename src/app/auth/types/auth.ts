/** Espeja el enum `user_role` de la base y el `role` que viaja dentro del JWT. */
export type Rol = 'investor' | 'advisor';

/** Respuesta de POST /api/auth/login y /api/auth/register. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: Rol;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  cedula_ruc?: string;
}
