/**
 * Localização do usuário com estado formal de permissão.
 * Opcionalmente acompanha a posição (watch); a assinatura é removida no cleanup.
 * Ao voltar das configurações do sistema, revalida a permissão.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import * as locationService from '../services/locationService';
import type { Coordinates, LocationPermissionState } from '../types/location';

interface UseLocationOptions {
  /** Acompanha a posição enquanto a tela estiver montada. */
  watch?: boolean;
}

export interface UseLocationResult {
  coordinates: Coordinates | null;
  permission: LocationPermissionState;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<LocationPermissionState>;
  refresh: () => Promise<void>;
  openSettings: () => Promise<void>;
}

const LOCATION_ERROR = 'Não foi possível obter sua localização agora.';

export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  const { watch = false } = options;
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [permission, setPermission] = useState<LocationPermissionState>('undetermined');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Lê a permissão e, se concedida, a posição atual. */
  const loadLocation = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const state = await locationService.getLocationPermissionState();
      if (!mountedRef.current) {
        return;
      }
      setPermission(state);
      if (state === 'granted') {
        const current = await locationService.getCurrentCoordinates();
        if (mountedRef.current) {
          setCoordinates(current);
        }
      }
    } catch {
      if (mountedRef.current) {
        setError(LOCATION_ERROR);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Carga inicial.
  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  // Ao voltar para o app (ex.: depois de abrir as configurações), revalida.
  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') {
        loadLocation();
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [loadLocation]);

  // Acompanhamento da posição (somente com permissão concedida).
  useEffect(() => {
    if (!watch || permission !== 'granted') {
      return undefined;
    }
    let active = true;
    let removeWatch: (() => void) | null = null;

    locationService
      .watchCoordinates((next) => {
        if (active) {
          setCoordinates(next);
        }
      })
      .then((remove) => {
        if (active) {
          removeWatch = remove;
        } else {
          // A tela desmontou antes da assinatura ficar pronta.
          remove();
        }
      })
      .catch(() => {
        if (active) {
          setError(LOCATION_ERROR);
        }
      });

    return () => {
      active = false;
      if (removeWatch) {
        removeWatch();
      }
    };
  }, [watch, permission]);

  const requestPermission = useCallback(async (): Promise<LocationPermissionState> => {
    setLoading(true);
    setError(null);
    try {
      const state = await locationService.requestLocationPermission();
      if (mountedRef.current) {
        setPermission(state);
      }
      if (state === 'granted') {
        const current = await locationService.getCurrentCoordinates();
        if (mountedRef.current) {
          setCoordinates(current);
        }
      }
      return state;
    } catch {
      if (mountedRef.current) {
        setError(LOCATION_ERROR);
      }
      return 'denied';
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const openSettings = useCallback(async (): Promise<void> => {
    await locationService.openAppSettings();
  }, []);

  return {
    coordinates,
    permission,
    loading,
    error,
    requestPermission,
    refresh: loadLocation,
    openSettings,
  };
}
