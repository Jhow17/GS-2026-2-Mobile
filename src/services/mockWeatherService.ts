/**
 * Dados de clima fixos e determinísticos (sem aleatoriedade).
 * Mesmas assinaturas do weatherService: usado sem chave ou para demonstrar sem internet.
 * Cenário: tarde quente (34 °C, 55% de umidade -> índice ≈ 40 °C, faixa "perigo").
 */
import { MONITORED_POINTS } from '../config/appConfig';
import type {
  AirQuality,
  ForecastSlot,
  HotSpot,
  WeatherBundle,
  WeatherReading,
  WeatherTileLayer,
} from '../types/weather';
import { buildWeatherBundle, calculateHeatIndex, getAlertLevel } from './heatIndexService';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/** Temperatura e umidade típicas por horário do dia (índice = hora / 3). */
const DAILY_TEMPERATURES = [24, 23, 22, 27, 33, 35, 30, 26];
const DAILY_HUMIDITY = [80, 85, 88, 70, 50, 45, 55, 70];
/** Pequena variação por dia da previsão (5 dias). */
const DAY_OFFSETS = [0, 1, -1, 2, 0];

/** Variação fixa de cada ponto monitorado em relação à leitura base. */
const HOTSPOT_TEMPERATURE_OFFSETS = [1.5, 0.5, -0.5, -2, 2.5, 0, 1, -1.5, 0.8, 3];
const HOTSPOT_HUMIDITY = [52, 55, 58, 65, 48, 57, 53, 62, 56, 46];

/** Início (em ms) da faixa de 3 horas atual, alinhada ao relógio. */
function currentSlotStart(now: Date): number {
  const aligned = new Date(now);
  aligned.setMinutes(0, 0, 0);
  aligned.setHours(Math.floor(aligned.getHours() / 3) * 3);
  return aligned.getTime();
}

export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherReading> {
  return {
    id: `mock:${latitude.toFixed(2)}:${longitude.toFixed(2)}`,
    name: 'São Paulo (demonstração)',
    latitude,
    longitude,
    temperatureC: 34,
    feelsLikeC: 37,
    humidity: 55,
    windSpeedMs: 2.5,
    description: 'céu limpo',
    iconCode: '01d',
    readAt: new Date().toISOString(),
    source: 'mock',
  };
}

export async function getForecast(_latitude: number, _longitude: number): Promise<ForecastSlot[]> {
  const start = currentSlotStart(new Date()) + THREE_HOURS_MS;
  return Array.from({ length: 40 }, (_, index) => {
    const time = new Date(start + index * THREE_HOURS_MS);
    const hourIndex = Math.floor(time.getHours() / 3);
    const dayOffset = DAY_OFFSETS[Math.floor(index / 8)] ?? 0;
    return {
      at: time.toISOString(),
      temperatureC: (DAILY_TEMPERATURES[hourIndex] ?? 28) + dayOffset,
      humidity: DAILY_HUMIDITY[hourIndex] ?? 60,
    };
  });
}

export async function getAirQuality(_latitude: number, _longitude: number): Promise<AirQuality> {
  return { index: 3, pm25: 28.4 };
}

export async function getWeatherBundle(
  latitude: number,
  longitude: number,
  useWorkerProfile: boolean = false,
): Promise<WeatherBundle> {
  const [current, airQuality, forecast] = await Promise.all([
    getCurrentWeather(latitude, longitude),
    getAirQuality(latitude, longitude),
    getForecast(latitude, longitude),
  ]);
  return buildWeatherBundle({
    current,
    airQuality,
    forecast,
    isStale: false,
    fetchedAt: new Date().toISOString(),
    useWorkerProfile,
  });
}

export async function getHotSpots(useWorkerProfile: boolean = false): Promise<HotSpot[]> {
  const readAt = new Date().toISOString();
  const spots = MONITORED_POINTS.map((point, index): HotSpot => {
    const temperatureC = 33 + (HOTSPOT_TEMPERATURE_OFFSETS[index] ?? 0);
    const humidity = HOTSPOT_HUMIDITY[index] ?? 55;
    const heatIndexC = calculateHeatIndex(temperatureC, humidity);
    return {
      id: point.id,
      name: point.name,
      latitude: point.latitude,
      longitude: point.longitude,
      temperatureC,
      feelsLikeC: temperatureC + 2,
      humidity,
      windSpeedMs: 2,
      description: 'céu limpo',
      iconCode: '01d',
      readAt,
      source: 'mock',
      heatIndexC,
      level: getAlertLevel(heatIndexC, useWorkerProfile),
    };
  });
  return [...spots].sort((a, b) => b.heatIndexC - a.heatIndexC);
}

/** Sem chave não há tiles: devolve texto vazio e o mapa esconde a camada. */
export function getWeatherTileUrl(_layer: WeatherTileLayer): string {
  return '';
}
