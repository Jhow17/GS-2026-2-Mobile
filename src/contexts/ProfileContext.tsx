/**
 * Contexto do perfil do cidadão, sincronizado automaticamente com a sessão
 * autenticada do AuthContext (retrocompatível com pontos já salvos - Opção 7A).
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '../hooks/useAuth';
import * as profileStorage from '../services/profileStorage';
import type { CitizenProfile, ProfileInput } from '../types/profile';

export interface ProfileContextValue {
  profile: CitizenProfile | null;
  loading: boolean;
  saveProfile: (input: ProfileInput) => Promise<CitizenProfile>;
  clearProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const { session, loading: authLoading } = useAuth();
  const [legacyProfile, setLegacyProfile] = useState<CitizenProfile | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    let active = true;
    profileStorage
      .getProfile()
      .then((stored) => {
        if (active) {
          setLegacyProfile(stored);
        }
      })
      .finally(() => {
        if (active) {
          setStorageLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const activeProfile = useMemo<CitizenProfile | null>(() => {
    if (session) {
      return {
        id: session.userId,
        name: session.name,
        contact: session.contact ?? session.email,
        createdAt: session.loggedInAt,
      };
    }
    return null;
  }, [session]);

  const saveProfile = useCallback(
    async (input: ProfileInput): Promise<CitizenProfile> => {
      const saved = await profileStorage.saveProfile(input);
      setLegacyProfile(saved);
      return saved;
    },
    [],
  );

  const clearProfile = useCallback(async (): Promise<void> => {
    await profileStorage.clearProfile();
    setLegacyProfile(null);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile: activeProfile,
      loading: authLoading || storageLoading,
      saveProfile,
      clearProfile,
    }),
    [activeProfile, authLoading, storageLoading, saveProfile, clearProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
