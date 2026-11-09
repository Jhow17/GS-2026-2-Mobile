/**
 * Modelos internos de clima, independentes do formato da OpenWeather.
 * Trocar a fonte de dados (ex.: sensores ESP32) não deve alterar estes tipos.
 */

/** Os cinco níveis de alerta usados em todo o app. */
export type AlertLevel = 'normal' | 'atencao' | 'cuidado' | 'perigo' | 'perigo_extremo';

/** Índice de qualidade do ar da OpenWeather (1 = bom, 5 = muito ruim). */
export type AirQualityIndex = 1 | 2 | 3 | 4 | 5;

/** Origem da leitura. */
export type WeatherSource = 'openweather' | 'mock';

/** Tendência do índice de calor para as próximas horas. */
export type HeatTrend = 'subindo' | 'estavel' | 'caindo';

/** Camadas de tiles do Weather Maps 1.0. */
export type WeatherTileLayer = 'temp_new' | 'precipitation_new' | 'clouds_new' | 'wind_new';

/** Leitura do clima atual em um local. */
export interface WeatherReading {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  feelsLikeC: number;
  humidity: number;
  windSpeedMs: number;
  description: string;
  iconCode: string;
  /** Data e hora da leitura em texto ISO. */
  readAt: string;
  source: WeatherSource;
}

/** Qualidade do ar. */
export interface AirQuality {
  index: AirQualityIndex;
  pm25: number;
}

/** Faixa de 3 horas da previsão. */
export interface ForecastSlot {
  /** Início da faixa em texto ISO. */
  at: string;
  temperatureC: number;
  humidity: number;
}

/** Faixa da previsão já com índice de calor e nível calculados. */
export interface ForecastHeatSlot extends ForecastSlot {
  heatIndexC: number;
  level: AlertLevel;
}

/** Ponto monitorado da cidade com índice de calor calculado. */
export interface HotSpot extends WeatherReading {
  heatIndexC: number;
  level: AlertLevel;
}

/** Resultado do motor de regras para a leitura atual. */
export interface WeatherAlert {
  heatIndexC: number;
  heatLevel: AlertLevel;
  airLevel: AlertLevel;
  combinedLevel: AlertLevel;
}

/** Pacote completo usado pela tela inicial. */
export interface WeatherBundle {
  current: WeatherReading;
  airQuality: AirQuality;
  forecast: ForecastHeatSlot[];
  alert: WeatherAlert;
  trend: HeatTrend;
  /** Momento em que o pacote foi montado (ISO). */
  fetchedAt: string;
  /** Verdadeiro quando algum dado veio do cache vencido por falha de rede. */
  isStale: boolean;
}
