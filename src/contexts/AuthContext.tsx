/**
 * Contexto global de autenticação (M5 e M6).
 * Gerencia a sessão persistente de usuário comum ('user') e administrador ('admin').
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as authStorage from '../services/authStorage';
import type { AuthSession, LoginInput, RegisterInput } from '../types/auth';

export interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authStorage
      .getStoredSession()
      .then((stored) => {
        if (active) {
          setSession(stored);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<AuthSession> => {
    const nextSession = await authStorage.authenticateUser(input);
    setSession(nextSession);
    return nextSession;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthSession> => {
    const nextSession = await authStorage.registerUserAccount(input);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authStorage.clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: session !== null,
      isAdmin: session?.role === 'admin',
      login,
      register,
      logout,
    }),
    [session, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
