/**
 * Chamadas à OpenWeather (Current weather, 5 day / 3 hour forecast e Air Pollution)
 * com cache no AsyncStorage e fallback para cache vencido sem rede.
 * Se USE_MOCK_WEATHER for verdadeiro ou a chave estiver ausente, delega ao mock.
 */
import {
  CACHE_TTL_MS,
  MONITORED_POINTS,
  OPENWEATHER_API_KEY,
  OPENWEATHER_TILES_URL,
  SHOULD_USE_MOCK_WEATHER,
} from '../config/appConfig';
import type {
  OpenWeatherAirResponse,
  OpenWeatherCurrentResponse,
  OpenWeatherForecastItem,
  OpenWeatherForecastResponse,
} from '../types/openWeather';
import type {
  AirQuality,
  ForecastSlot,
  HotSpot,
  WeatherBundle,
  WeatherReading,
  WeatherTileLayer,
} from '../types/weather';
import {
  isAirQuality,
  isAirQualityIndex,
  isForecastSlotList,
  isRecord,
  isWeatherReading,
} from '../utils/validation';
import { api } from './api';
import { buildCacheKey, getCached, getStale, setCached, type TypeGuard } from './cacheStorage';
import { buildWeatherBundle, calculateHeatIndex, getAlertLevel } from './heatIndexService';
import * as mockWeatherService from './mockWeatherService';

/** Mensagem amigável única para falhas de clima (sem detalhes técnicos). */
const FRIENDLY_ERROR =
  'Não foi possível carregar o clima agora. Verifique sua conexão e tente de novo.';

/** Resultado interno: dado + indicação de cache vencido. */
interface LoadResult<T> {
  data: T;
  isStale: boolean;
}

// ---------------------------------------------------------------------------
// Guardas das respostas brutas (dado de fora entra como unknown)
// ---------------------------------------------------------------------------

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMainBlock(value: unknown): boolean {
  return (
    isRecord(value) && isNumber(value.temp) && isNumber(value.feels_like) && isNumber(value.humidity)
  );
}

function isCurrentResponse(value: unknown): value is OpenWeatherCurrentResponse {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isNumber(value.dt) &&
    isRecord(value.coord) &&
    isNumber(value.coord.lat) &&
    isNumber(value.coord.lon) &&
    isMainBlock(value.main) &&
    isRecord(value.wind) &&
    isNumber(value.wind.speed) &&
    Array.isArray(value.weather)
  );
}

function isForecastItem(value: unknown): value is OpenWeatherForecastItem {
  return isRecord(value) && isNumber(value.dt) && isMainBlock(value.main);
}

function isForecastResponse(value: unknown): value is OpenWeatherForecastResponse {
  return isRecord(value) && Array.isArray(value.list) && value.list.every(isForecastItem);
}

function isAirResponse(value: unknown): value is OpenWeatherAirResponse {
  if (!isRecord(value) || !Array.isArray(value.list) || value.list.length === 0) {
    return false;
  }
  const first: unknown = value.list[0];
  return (
    isRecord(first) &&
    isRecord(first.main) &&
    isAirQualityIndex(first.main.aqi) &&
    isRecord(first.components) &&
    isNumber(first.components.pm2_5)
  );
}

// ---------------------------------------------------------------------------
// Conversões para os modelos internos
// ---------------------------------------------------------------------------

function mapCurrent(
  raw: OpenWeatherCurrentResponse,
  latitude: number,
  longitude: number,
): WeatherReading {
  const condition: unknown = raw.weather[0];
  const description =
    isRecord(condition) && typeof condition.description === 'string' ? condition.description : '';
  const iconCode = isRecord(condition) && typeof condition.icon === 'string' ? condition.icon : '';
  return {
    id: `current:${latitude.toFixed(2)}:${longitude.toFixed(2)}`,
    name: raw.name.length > 0 ? raw.name : 'Sua região',
    latitude,
    longitude,
    temperatureC: raw.main.temp,
    feelsLikeC: raw.main.feels_like,
    humidity: raw.main.humidity,
    windSpeedMs: raw.wind.speed,
    description,
    iconCode,
    readAt: new Date(raw.dt * 1000).toISOString(),
    source: 'openweather',
  };
}

function mapForecastItem(item: OpenWeatherForecastItem): ForecastSlot {
  return {
    at: new Date(item.dt * 1000).toISOString(),
    temperatureC: item.main.temp,
    humidity: item.main.humidity,
  };
}

function mapForecast(raw: OpenWeatherForecastResponse): ForecastSlot[] {
  return raw.list.map(mapForecastItem);
}

function mapAirQuality(raw: OpenWeatherAirResponse): AirQuality | null {
  const first = raw.list[0];
  if (!first || !isAirQualityIndex(first.main.aqi)) {
    return null;
  }
  return { index: first.main.aqi, pm25: first.components.pm2_5 };
}

// ---------------------------------------------------------------------------
// Cache + rede + fallback
// ---------------------------------------------------------------------------

/**
 * 1) Cache válido -> devolve.  2) Rede -> grava e devolve.
 * 3) Rede falhou -> cache vencido com isStale.  4) Sem cache -> erro amigável.
 */
async function loadWithCache<T>(
  cacheKey: string,
  ttlMs: number,
  isValid: TypeGuard<T>,
  fetcher: () => Promise<T>,
): Promise<LoadResult<T>> {
  const cached = await getCached(cacheKey, ttlMs, isValid);
  if (cached !== null) {
    return { data: cached, isStale: false };
  }
  try {
    const fresh = await fetcher();
    await setCached(cacheKey, fresh);
    return { data: fresh, isStale: false };
  } catch {
    const stale = await getStale(cacheKey, isValid);
    if (stale) {
      return { data: stale.data, isStale: true };
    }
    throw new Error(FRIENDLY_ERROR);
  }
}

async function loadCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<LoadResult<WeatherReading>> {
  return loadWithCache(
    buildCacheKey('current', latitude, longitude),
    CACHE_TTL_MS.current,
    isWeatherReading,
    async (): Promise<WeatherReading> => {
      const response = await api.get<OpenWeatherCurrentResponse>('/weather', {
        params: { lat: latitude, lon: longitude },
      });
      const data: unknown = response.data;
      if (!isCurrentResponse(data)) {
        throw new Error('Resposta inesperada');
      }
      return mapCurrent(data, latitude, longitude);
    },
  );
}

async function loadForecast(
  latitude: number,
  longitude: number,
): Promise<LoadResult<ForecastSlot[]>> {
  return loadWithCache(
    buildCacheKey('forecast', latitude, longitude),
    CACHE_TTL_MS.forecast,
    isForecastSlotList,
    async (): Promise<ForecastSlot[]> => {
      const response = await api.get<OpenWeatherForecastResponse>('/forecast', {
        params: { lat: latitude, lon: longitude },
      });
      const data: unknown = response.data;
      if (!isForecastResponse(data)) {
        throw new Error('Resposta inesperada');
      }
      // Guardamos as 40 faixas de 3 horas.
      return mapForecast(data);
    },
  );
}

async function loadAirQuality(
  latitude: number,
  longitude: number,
): Promise<LoadResult<AirQuality>> {
  return loadWithCache(
    buildCacheKey('air', latitude, longitude),
    CACHE_TTL_MS.air,
    isAirQuality,
    async (): Promise<AirQuality> => {
      const response = await api.get<OpenWeatherAirResponse>('/air_pollution', {
        params: { lat: latitude, lon: longitude },
      });
      const data: unknown = response.data;
      const mapped = isAirResponse(data) ? mapAirQuality(data) : null;
      if (!mapped) {
        throw new Error('Resposta inesperada');
      }
      return mapped;
    },
  );
}

// ---------------------------------------------------------------------------
// API pública do service
// ---------------------------------------------------------------------------

/** Clima atual (GET /weather). */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherReading> {
  if (SHOULD_USE_MOCK_WEATHER) {
    return mockWeatherService.getCurrentWeather(latitude, longitude);
  }
  const result = await loadCurrentWeather(latitude, longitude);
  return result.data;
}

/** Previsão de 5 dias em 40 faixas de 3 horas (GET /forecast). */
export async function getForecast(latitude: number, longitude: number): Promise<ForecastSlot[]> {
  if (SHOULD_USE_MOCK_WEATHER) {
    return mockWeatherService.getForecast(latitude, longitude);
  }
  const result = await loadForecast(latitude, longitude);
  return result.data;
}

/** Qualidade do ar (GET /air_pollution). */
export async function getAirQuality(latitude: number, longitude: number): Promise<AirQuality> {
  if (SHOULD_USE_MOCK_WEATHER) {
    return mockWeatherService.getAirQuality(latitude, longitude);
  }
  const result = await loadAirQuality(latitude, longitude);
  return result.data;
}

/** Busca as três fontes em paralelo e monta o pacote com o motor de regras. */
export async function getWeatherBundle(
  latitude: number,
  longitude: number,
  useWorkerProfile: boolean = false,
): Promise<WeatherBundle> {
  if (SHOULD_USE_MOCK_WEATHER) {
    return mockWeatherService.getWeatherBundle(latitude, longitude, useWorkerProfile);
  }
  const [current, airQuality, forecast] = await Promise.all([
    loadCurrentWeather(latitude, longitude),
    loadAirQuality(latitude, longitude),
    loadForecast(latitude, longitude),
  ]);
  return buildWeatherBundle({
    current: current.data,
    airQuality: airQuality.data,
    forecast: forecast.data,
    isStale: current.isStale || airQuality.isStale || forecast.isStale,
    fetchedAt: new Date().toISOString(),
    useWorkerProfile,
  });
}

/** Ranking dos pontos monitorados, do mais quente para o mais ameno. */
export async function getHotSpots(useWorkerProfile: boolean = false): Promise<HotSpot[]> {
  if (SHOULD_USE_MOCK_WEATHER) {
    return mockWeatherService.getHotSpots(useWorkerProfile);
  }
  const results = await Promise.allSettled(
    MONITORED_POINTS.map(async (point): Promise<HotSpot> => {
      const reading = await loadCurrentWeather(point.latitude, point.longitude);
      const heatIndexC = calculateHeatIndex(reading.data.temperatureC, reading.data.humidity);
      return {
        ...reading.data,
        id: point.id,
        name: point.name,
        heatIndexC,
        level: getAlertLevel(heatIndexC, useWorkerProfile),
      };
    }),
  );
  const spots = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  if (spots.length === 0) {
    throw new Error('Não foi possível carregar os pontos mais quentes agora.');
  }
  return [...spots].sort((a, b) => b.heatIndexC - a.heatIndexC);
}

/** Modelo de URL dos tiles do Weather Maps 1.0 para o UrlTile (vazio sem chave). */
export function getWeatherTileUrl(layer: WeatherTileLayer): string {
  if (OPENWEATHER_API_KEY.trim().length === 0) {
    return mockWeatherService.getWeatherTileUrl(layer);
  }
  return `${OPENWEATHER_TILES_URL}/${layer}/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`;
}
