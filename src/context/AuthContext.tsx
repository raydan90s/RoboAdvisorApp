import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import type { Rol, TokenResponse } from '@/app/auth/types/auth';
import { deleteToken, getToken, saveToken } from '@/services/tokenStorage';

const USER_KEY = '@roboadvisor_user';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  /** Decide qué navegador ve el usuario. Viene firmado dentro del JWT: el
   *  cliente lo lee, pero no lo elige — el backend revalida en cada request. */
  role: Rol;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  role: Rol | null;
  isLoading: boolean;
  signIn: (respuesta: TokenResponse) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaura la sesión guardada al arrancar
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getToken(),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /** Recibe tal cual la respuesta de /api/auth/login o /register. */
  async function signIn(respuesta: TokenResponse) {
    const nuevoUsuario: AuthUser = {
      id: respuesta.user_id,
      name: respuesta.full_name,
      email: respuesta.email,
      role: respuesta.role,
    };
    setToken(respuesta.access_token);
    setUser(nuevoUsuario);
    await saveToken(respuesta.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nuevoUsuario));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    await deleteToken();
    await AsyncStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, role: user?.role ?? null, isLoading, signIn, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
