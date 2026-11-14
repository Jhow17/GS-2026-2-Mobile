/**
 * Contexto do perfil do cidadão, sincronizado automaticamente com a sessão
 * autenticada do AuthContext (retrocompatível com pontos já salvos - Opção 7A),
 * incluindo preferências de modo rua e alertas de calor por notificação.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import * as notificationService from '../services/notificationService';
import * as profileStorage from '../services/profileStorage';
import type { LocationPermissionState } from '../types/location';
import type { CitizenProfile, ProfileInput } from '../types/profile';

export interface ProfileContextValue {
  profile: CitizenProfile | null;
  workerMode: boolean;
  heatAlertsEnabled: boolean;
  notificationPermission: LocationPermissionState;
  loading: boolean;
  saveProfile: (input: ProfileInput) => Promise<CitizenProfile>;
  clearProfile: () => Promise<void>;
  setWorkerMode: (value: boolean) => Promise<void>;
  setHeatAlertsEnabled: (value: boolean) => Promise<void>;
  requestNotificationPermission: () => Promise<LocationPermissionState>;
  openNotificationSettings: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const { session, loading: authLoading } = useAuth();
  const [, setLegacyProfile] = useState<CitizenProfile | null>(null);
  const [workerMode, setWorkerModeState] = useState<boolean>(false);
  const [heatAlertsEnabled, setHeatAlertsEnabledState] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] =
    useState<LocationPermissionState>('undetermined');
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      profileStorage.getProfile(),
      profileStorage.getWorkerMode(),
      profileStorage.getHeatAlertsEnabled(),
      notificationService.getNotificationPermissionState(),
    ])
      .then(([storedProfile, storedWorkerMode, storedHeatAlerts, permState]) => {
        if (active) {
          setLegacyProfile(storedProfile);
          setWorkerModeState(storedWorkerMode);
          setHeatAlertsEnabledState(storedHeatAlerts);
          setNotificationPermission(permState);
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

  // Revalida a permissão de notificação ao voltar das configurações do sistema.
  useEffect(() => {
    let active = true;
    let previous: string = AppState.currentState ?? 'active';
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') {
        notificationService
          .getNotificationPermissionState()
          .then((permState) => {
            if (active) {
              setNotificationPermission(permState);
            }
          });
      }
      previous = next;
    });
    return () => {
      active = false;
      subscription.remove();
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

  const setWorkerMode = useCallback(async (value: boolean): Promise<void> => {
    setWorkerModeState(value);
    await profileStorage.setWorkerMode(value);
  }, []);

  const requestNotificationPermission =
    useCallback(async (): Promise<LocationPermissionState> => {
      const state = await notificationService.requestNotificationPermission();
      setNotificationPermission(state);
      return state;
    }, []);

  const openNotificationSettings = useCallback(async (): Promise<void> => {
    await notificationService.openNotificationSettings();
  }, []);

  const setHeatAlertsEnabled = useCallback(
    async (value: boolean): Promise<void> => {
      setHeatAlertsEnabledState(value);
      await profileStorage.setHeatAlertsEnabled(value);
      if (value) {
        const currentPerm =
          await notificationService.getNotificationPermissionState();
        if (currentPerm !== 'granted') {
          const nextPerm =
            await notificationService.requestNotificationPermission();
          setNotificationPermission(nextPerm);
        } else {
          setNotificationPermission(currentPerm);
        }
      } else {
        await notificationService.cancelAllHeatNotifications();
      }
    },
    [],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile: activeProfile,
      workerMode,
      heatAlertsEnabled,
      notificationPermission,
      loading: authLoading || storageLoading,
      saveProfile,
      clearProfile,
      setWorkerMode,
      setHeatAlertsEnabled,
      requestNotificationPermission,
      openNotificationSettings,
    }),
    [
      activeProfile,
      workerMode,
      heatAlertsEnabled,
      notificationPermission,
      authLoading,
      storageLoading,
      saveProfile,
      clearProfile,
      setWorkerMode,
      setHeatAlertsEnabled,
      requestNotificationPermission,
      openNotificationSettings,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
