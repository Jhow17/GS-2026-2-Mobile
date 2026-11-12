/**
 * Hook para consumir o AuthContext (lança erro explícito se usado fora do AuthProvider).
 */
import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return context;
}
