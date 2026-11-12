/**
 * Consome o ProfileContext (lança erro claro fora do provider).
 */
import { useContext } from 'react';

import { ProfileContext, type ProfileContextValue } from '../contexts/ProfileContext';

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile deve ser usado dentro de <ProfileProvider>.');
  }
  return context;
}
