/**
 * Tipos das respostas brutas da OpenWeather.
 * Descrevem SOMENTE os campos usados pelo app. Os dados chegam como unknown
 * no runtime e são conferidos pelas guardas em weatherService antes do uso.
 */

/** Item de condição do tempo (descrição e ícone). */
export interface OpenWeatherCondition {
  description: string;
  icon: string;
}

/** Bloco "main" com temperatura, sensação térmica e umidade. */
export interface OpenWeatherMain {
  temp: number;
  feels_like: number;
  humidity: number;
}

/** Bloco "wind" com velocidade do vento em m/s (units=metric). */
export interface OpenWeatherWind {
  speed: number;
}

/** Resposta de GET /weather (clima atual). */
export interface OpenWeatherCurrentResponse {
  name: string;
  dt: number;
  coord: { lat: number; lon: number };
  main: OpenWeatherMain;
  wind: OpenWeatherWind;
  weather: OpenWeatherCondition[];
}

/** Faixa de 3 horas de GET /forecast. */
export interface OpenWeatherForecastItem {
  dt: number;
  main: OpenWeatherMain;
}

/** Resposta de GET /forecast (5 dias / 3 horas, 40 faixas). */
export interface OpenWeatherForecastResponse {
  list: OpenWeatherForecastItem[];
}

/** Item de GET /air_pollution: índice de 1 a 5 e concentração de PM2.5. */
export interface OpenWeatherAirItem {
  main: { aqi: number };
  components: { pm2_5: number };
}

/** Resposta de GET /air_pollution. */
export interface OpenWeatherAirResponse {
  list: OpenWeatherAirItem[];
}
