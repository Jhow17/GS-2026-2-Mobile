/**
 * Contexto do perfil local, do modo avaliador e do perfil "trabalhador na rua".
 */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as profileStorage from '../services/profileStorage';
import type { CitizenProfile, ProfileInput } from '../types/profile';

export interface ProfileContextValue {
  profile: CitizenProfile | null;
  loading: boolean;
  saveProfile: (input: ProfileInput) => Promise<CitizenProfile>;
  clearProfile: () => Promise<void>;
  reviewerMode: boolean;
  setReviewerMode: (value: boolean) => Promise<void>;
  /** Perfil "trabalhador na rua": desloca as faixas de alerta (só em memória). */
  workerMode: boolean;
  setWorkerMode: (value: boolean) => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [reviewerMode, setReviewerModeState] = useState(false);
  const [workerMode, setWorkerMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // Carrega o perfil e o modo avaliador ao abrir o app.
  useEffect(() => {
    let active = true;

    async function loadProfile(): Promise<void> {
      try {
        const [storedProfile, storedReviewerMode] = await Promise.all([
          profileStorage.getProfile(),
          profileStorage.getReviewerMode(),
        ]);
        if (active) {
          setProfile(storedProfile);
          setReviewerModeState(storedReviewerMode);
        }
      } catch {
        // Falha de leitura: seguimos sem perfil (o app funciona sem identificação).
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = useCallback(async (input: ProfileInput): Promise<CitizenProfile> => {
    const saved = await profileStorage.saveProfile(input);
    setProfile(saved);
    return saved;
  }, []);

  const clearProfile = useCallback(async (): Promise<void> => {
    await profileStorage.clearProfile();
    setProfile(null);
  }, []);

  const setReviewerMode = useCallback(async (value: boolean): Promise<void> => {
    await profileStorage.setReviewerMode(value);
    setReviewerModeState(value);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loading,
      saveProfile,
      clearProfile,
      reviewerMode,
      setReviewerMode,
      workerMode,
      setWorkerMode,
    }),
    [profile, loading, saveProfile, clearProfile, reviewerMode, setReviewerMode, workerMode],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
