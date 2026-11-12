/**
 * Motor de regras do Ã­ndice de calor (calculado no cliente).
 * Somente funÃ§Ãµes puras e sÃ­ncronas: sem rede e sem AsyncStorage.
 * NÃ£o Ã© aprendizado de mÃ¡quina: sÃ£o fÃ³rmulas pÃºblicas (Steadman/Rothfusz, NOAA)
 * e faixas fixas, o que torna cada alerta explicÃ¡vel.
 */
import { WORKER_PROFILE_OFFSET_C } from '../config/appConfig';
import type {
  AirQuality,
  AirQualityIndex,
  AlertLevel,
  ForecastHeatSlot,
  ForecastSlot,
  HeatTrend,
  WeatherAlert,
  WeatherBundle,
  WeatherReading,
} from '../types/weather';
import { celsiusToFahrenheit, fahrenheitToCelsius, roundToOneDecimal } from '../utils/temperature';

/** Ordem de gravidade dos nÃ­veis (do mais leve ao mais grave). */
const ALERT_ORDER: readonly AlertLevel[] = [
  'normal',
  'atencao',
  'cuidado',
  'perigo',
  'perigo_extremo',
];

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/**
 * Calcula o Ã­ndice de calor (sensaÃ§Ã£o por temperatura + umidade).
 * Recebe Â°C e % de umidade; devolve Â°C com 1 casa decimal.
 */
export function calculateHeatIndex(temperatureC: number, humidity: number): number {
  const t = celsiusToFahrenheit(temperatureC);
  const r = humidity;

  // 1. FÃ³rmula simples de Steadman.
  const simple = 0.5 * (t + 61.0 + (t - 68.0) * 1.2 + r * 0.094);

  // 2. Se a mÃ©dia entre a simples e T for menor que 80 Â°F, ela basta.
  if ((simple + t) / 2 < 80) {
    return roundToOneDecimal(fahrenheitToCelsius(simple));
  }

  // 3. RegressÃ£o de Rothfusz.
  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * r -
    0.22475541 * t * r -
    0.00683783 * t * t -
    0.05481717 * r * r +
    0.00122874 * t * t * r +
    0.00085282 * t * r * r -
    0.00000199 * t * t * r * r;

  // Ajuste A: umidade muito baixa com calor.
  if (r < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  }
  // Ajuste B: umidade muito alta com calor moderado.
  if (r > 85 && t >= 80 && t <= 87) {
    hi += ((r - 85) / 10) * ((87 - t) / 5);
  }

  return roundToOneDecimal(fahrenheitToCelsius(hi));
}

/**
 * Converte o Ã­ndice de calor em nÃ­vel de alerta.
 * No perfil "trabalhador na rua" as faixas descem WORKER_PROFILE_OFFSET_C graus.
 */
export function getAlertLevel(heatIndexC: number, useWorkerProfile: boolean): AlertLevel {
  const offset = useWorkerProfile ? WORKER_PROFILE_OFFSET_C : 0;
  if (heatIndexC >= 52 - offset) {
    return 'perigo_extremo';
  }
  if (heatIndexC >= 39 - offset) {
    return 'perigo';
  }
  if (heatIndexC >= 32 - offset) {
    return 'cuidado';
  }
  if (heatIndexC >= 27 - offset) {
    return 'atencao';
  }
  return 'normal';
}

/** Converte o Ã­ndice de qualidade do ar (1 a 5) em nÃ­vel de alerta. */
export function getAirQualityAlert(index: AirQualityIndex): AlertLevel {
  switch (index) {
    case 1:
    case 2:
      return 'normal';
    case 3:
      return 'atencao';
    case 4:
      return 'cuidado';
    case 5:
      return 'perigo';
  }
}

/** Devolve o mais grave dos dois nÃ­veis. */
export function combineAlerts(first: AlertLevel, second: AlertLevel): AlertLevel {
  return ALERT_ORDER.indexOf(first) >= ALERT_ORDER.indexOf(second) ? first : second;
}

/** Mensagem curta de orientaÃ§Ã£o para cada nÃ­vel. */
export function getAlertMessage(level: AlertLevel): string {
  switch (level) {
case 'normal':
  return 'Condições tranquilas. Mantenha-se hidratado durante o trabalho.';
case 'atencao':
  return 'Hidrate-se com frequência e leve água com você.';
case 'cuidado':
  return 'Faça pausas na sombra e beba água a cada 20 minutos.';
case 'perigo':
  return 'Reduza os esforços, faça pausas longas na sombra e evite o sol do meio-dia.';
case 'perigo_extremo':
  return 'Evite a exposição. Procure um local fresco e interrompa atividades pesadas.';
  }
}

/** Calcula Ã­ndice de calor e nÃ­vel de cada faixa da previsÃ£o. */
export function buildForecastHeatSlots(
  slots: ForecastSlot[],
  useWorkerProfile: boolean = false,
): ForecastHeatSlot[] {
  return slots.map((slot) => {
    const heatIndexC = calculateHeatIndex(slot.temperatureC, slot.humidity);
    return { ...slot, heatIndexC, level: getAlertLevel(heatIndexC, useWorkerProfile) };
  });
}

/** Faixas que comeÃ§am dentro da janela [agora - 3h, agora + hours]. */
function getUpcomingSlots<T extends ForecastSlot>(slots: T[], hours: number, now: Date): T[] {
  const start = now.getTime() - THREE_HOURS_MS;
  const end = now.getTime() + hours * 60 * 60 * 1000;
  const upcoming = slots.filter((slot) => {
    const time = new Date(slot.at).getTime();
    return time >= start && time <= end;
  });
  // Dados antigos (ex.: cache vencido): usamos as primeiras faixas disponÃ­veis.
  return upcoming.length > 0 ? upcoming : slots.slice(0, Math.max(1, Math.ceil(hours / 3)));
}

/** Faixa de menor Ã­ndice de calor nas prÃ³ximas `hours` horas. */
export function findMildestSlot(
  slots: ForecastHeatSlot[],
  hours: number,
  now: Date = new Date(),
): ForecastHeatSlot | null {
  const upcoming = getUpcomingSlots(slots, hours, now);
  return upcoming.reduce<ForecastHeatSlot | null>(
    (mildest, slot) => (mildest === null || slot.heatIndexC < mildest.heatIndexC ? slot : mildest),
    null,
  );
}

/** TendÃªncia entre o Ã­ndice atual e o da prÃ³xima faixa. */
export function getHeatTrend(currentC: number, nextC: number): HeatTrend {
  const difference = nextC - currentC;
  if (difference >= 1) {
    return 'subindo';
  }
  if (difference <= -1) {
    return 'caindo';
  }
  return 'estavel';
}

/** Monta o alerta da leitura atual: calor, ar e o combinado. */
export function buildWeatherAlert(
  reading: WeatherReading,
  airQuality: AirQuality,
  useWorkerProfile: boolean,
): WeatherAlert {
  const heatIndexC = calculateHeatIndex(reading.temperatureC, reading.humidity);
  const heatLevel = getAlertLevel(heatIndexC, useWorkerProfile);
  const airLevel = getAirQualityAlert(airQuality.index);
  return { heatIndexC, heatLevel, airLevel, combinedLevel: combineAlerts(heatLevel, airLevel) };
}

/** ParÃ¢metros para montar o pacote final de clima. */
export interface BuildBundleParams {
  current: WeatherReading;
  airQuality: AirQuality;
  forecast: ForecastSlot[];
  isStale: boolean;
  fetchedAt: string;
  useWorkerProfile: boolean;
  now?: Date;
}

/** Monta o WeatherBundle a partir dos dados jÃ¡ convertidos. */
export function buildWeatherBundle(params: BuildBundleParams): WeatherBundle {
  const now = params.now ?? new Date();
  const forecast = buildForecastHeatSlots(params.forecast, params.useWorkerProfile);
  const alert = buildWeatherAlert(params.current, params.airQuality, params.useWorkerProfile);
  const nextSlot = forecast.find((slot) => new Date(slot.at).getTime() > now.getTime());
  const trend = nextSlot ? getHeatTrend(alert.heatIndexC, nextSlot.heatIndexC) : 'estavel';
  return {
    current: params.current,
    airQuality: params.airQuality,
    forecast,
    alert,
    trend,
    fetchedAt: params.fetchedAt,
    isStale: params.isStale,
  };
}
