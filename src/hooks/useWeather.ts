/**
 * Clima da região (ou de DEFAULT_REGION) + ranking de pontos quentes.
 * Combina weatherService (dados) e heatIndexService (níveis conforme o perfil).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_REGION } from '../config/appConfig';
import { buildForecastHeatSlots, buildWeatherAlert, getAlertLevel } from '../services/heatIndexService';
import * as weatherService from '../services/weatherService';
import type { Coordinates } from '../types/location';
import type { HotSpot, WeatherBundle } from '../types/weather';

export interface UseWeatherResult {
  bundle: WeatherBundle | null;
  hotSpots: HotSpot[];
  hotSpotsError: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const BUNDLE_ERROR = 'Não foi possível carregar o clima agora. Verifique sua conexão.';
const HOTSPOTS_ERROR = 'Não foi possível carregar os pontos mais quentes.';

/** Arredonda a 2 casas para não buscar de novo a cada pequeno deslocamento. */
function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function useWeather(
  coordinates: Coordinates | null,
  workerMode: boolean = false,
): UseWeatherResult {
  const latitude = roundCoordinate(coordinates?.latitude ?? DEFAULT_REGION.latitude);
  const longitude = roundCoordinate(coordinates?.longitude ?? DEFAULT_REGION.longitude);

  const [rawBundle, setRawBundle] = useState<WeatherBundle | null>(null);
  const [rawHotSpots, setRawHotSpots] = useState<HotSpot[]>([]);
  const [hotSpotsError, setHotSpotsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Busca clima e pontos quentes; ignora respostas de buscas antigas. */
  const loadWeather = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      const isCurrent = (): boolean => mountedRef.current && requestRef.current === requestId;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [bundleResult, hotSpotsResult] = await Promise.allSettled([
          weatherService.getWeatherBundle(latitude, longitude),
          weatherService.getHotSpots(),
        ]);
        if (!isCurrent()) {
          return;
        }
        if (bundleResult.status === 'fulfilled') {
          setRawBundle(bundleResult.value);
        } else {
          setError(BUNDLE_ERROR);
        }
        if (hotSpotsResult.status === 'fulfilled') {
          setRawHotSpots(hotSpotsResult.value);
          setHotSpotsError(null);
        } else {
          setHotSpotsError(HOTSPOTS_ERROR);
        }
      } catch {
        if (isCurrent()) {
          setError(BUNDLE_ERROR);
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [latitude, longitude],
  );

  useEffect(() => {
    loadWeather(false);
  }, [loadWeather]);

  const reload = useCallback((): Promise<void> => loadWeather(true), [loadWeather]);

  // Reaplica as faixas do perfil escolhido sem nova chamada de rede.
  const bundle = useMemo<WeatherBundle | null>(() => {
    if (!rawBundle) {
      return null;
    }
    return {
      ...rawBundle,
      forecast: buildForecastHeatSlots(rawBundle.forecast, workerMode),
      alert: buildWeatherAlert(rawBundle.current, rawBundle.airQuality, workerMode),
    };
  }, [rawBundle, workerMode]);

  const hotSpots = useMemo<HotSpot[]>(
    () =>
      rawHotSpots.map((spot) => ({ ...spot, level: getAlertLevel(spot.heatIndexC, workerMode) })),
    [rawHotSpots, workerMode],
  );

  return { bundle, hotSpots, hotSpotsError, loading, refreshing, error, reload };
}
