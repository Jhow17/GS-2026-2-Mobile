/**
 * Configuração central do CitizenTech.
 * Todas as constantes ficam aqui, tipadas e comentadas.
 */

/** Ponto monitorado da cidade para o ranking de "pontos mais quentes". */
export interface MonitoredPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** Região inicial do mapa (formato aceito pelo react-native-maps). */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Chave da OpenWeather lida do .env (EXPO_PUBLIC_ fica embutida no app). */
export const OPENWEATHER_API_KEY: string = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '';

/** URL base da API de dados (Current, Forecast e Air Pollution). */
export const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/** URL base dos tiles do Weather Maps 1.0. */
export const OPENWEATHER_TILES_URL = 'https://tile.openweathermap.org/map';

/**
 * true força dados fixos do mockWeatherService (demonstração sem internet).
 * Mesmo com false, o mock é usado automaticamente quando a chave está ausente.
 */
export const USE_MOCK_WEATHER: boolean = false;

/** Indica se os services de clima devem usar o mock. */
export const SHOULD_USE_MOCK_WEATHER: boolean =
  USE_MOCK_WEATHER || OPENWEATHER_API_KEY.trim().length === 0;

/** Tempo de vida do cache, em milissegundos. */
export const CACHE_TTL_MS = {
  /** Clima atual: 10 minutos. */
  current: 10 * 60 * 1000,
  /** Qualidade do ar: 10 minutos. */
  air: 10 * 60 * 1000,
  /** Previsão de 5 dias / 3 horas: 30 minutos. */
  forecast: 30 * 60 * 1000,
} as const;

/**
 * Região usada quando não há localização.
 * PLACEHOLDER: centro de São Paulo (Praça da Sé). O grupo deve ajustar para a cidade escolhida.
 */
export const DEFAULT_REGION: MapRegion = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/**
 * Pontos monitorados para o ranking de calor.
 * PLACEHOLDERS em São Paulo: ajuste nomes e coordenadas para a cidade do grupo.
 */
export const MONITORED_POINTS: MonitoredPoint[] = [
  { id: 'mp-se', name: 'Praça da Sé', latitude: -23.5505, longitude: -46.6333 },
  { id: 'mp-paulista', name: 'Av. Paulista', latitude: -23.5614, longitude: -46.6559 },
  { id: 'mp-pinheiros', name: 'Largo da Batata', latitude: -23.5670, longitude: -46.6930 },
  { id: 'mp-ibirapuera', name: 'Parque Ibirapuera', latitude: -23.5874, longitude: -46.6576 },
  { id: 'mp-bras', name: 'Brás', latitude: -23.5432, longitude: -46.6166 },
  { id: 'mp-santana', name: 'Santana', latitude: -23.5025, longitude: -46.6252 },
  { id: 'mp-tatuape', name: 'Tatuapé', latitude: -23.5402, longitude: -46.5763 },
  { id: 'mp-santoamaro', name: 'Santo Amaro', latitude: -23.6536, longitude: -46.7097 },
  { id: 'mp-lapa', name: 'Lapa', latitude: -23.5226, longitude: -46.7036 },
  { id: 'mp-itaquera', name: 'Itaquera', latitude: -23.5367, longitude: -46.4553 },
];

/** Deslocamento (°C) das faixas de alerta no perfil "trabalhador na rua". */
export const WORKER_PROFILE_OFFSET_C = 2;

/** Exige foto da câmera para cadastrar um ponto novo. */
export const REQUIRE_PHOTO_FOR_NEW_POINT = true;

/** Raio (metros) considerado "perto" na tela inicial e na escolha de bebedouros. */
export const NEARBY_RADIUS_METERS = 2000;
