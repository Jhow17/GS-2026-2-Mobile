/**
 * Configurações gerais do app, leitura das variáveis públicas do Expo
 * e lista dos 10 pontos monitorados de São Paulo.
 */

export interface MonitoredPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Chave da OpenWeather vinda do ambiente (vazia se não configurada). */
export const OPENWEATHER_API_KEY: string =
  (process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '').trim();

/** Indica se há chave configurada para consultar a API real. */
export const HAS_API_KEY: boolean = OPENWEATHER_API_KEY.length > 0;

/** Usa o mock determinístico quando não há chave configurada. */
export const SHOULD_USE_MOCK_WEATHER: boolean = !HAS_API_KEY;

/** Desconto (em °C) aplicado aos limiares no perfil "Trabalho na rua". */
export const WORKER_PROFILE_OFFSET_C = 2;

/**
 * Credenciais da conta de Administrador semeada localmente (M5).
 * AVISO DE SEGURANÇA: Em um app 100% client-side (prova de conceito sem backend),
 * variáveis EXPO_PUBLIC_* e dados no AsyncStorage ficam no dispositivo. Em produção,
 * autenticação e controle de papel (RBAC) devem residir em um servidor seguro.
 */
export const ADMIN_SEED_EMAIL: string = (
  process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? 'admin@citizentech.org'
)
  .trim()
  .toLowerCase();

export const ADMIN_SEED_PASSWORD: string = (
  process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? 'Admin@2026'
).trim();

/** Endereço base da API 2.5 da OpenWeather. */
export const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/** Endereço base dos tiles do Weather Maps 1.0. */
export const OPENWEATHER_TILES_URL = 'https://tile.openweathermap.org/map';

/** Modelo de URL dos tiles do Weather Maps 1.0. */
export const OPENWEATHER_TILE_URL_TEMPLATE =
  'https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={apiKey}';

/** Região inicial: centro de São Paulo (usada quando a localização não está disponível). */
export const DEFAULT_REGION: MapRegion = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/** Tempo de vida do cache (em milissegundos) usado pelo weatherService. */
export const CACHE_TTL_MS = {
  current: 15 * 60 * 1000,
  forecast: 30 * 60 * 1000,
  air: 15 * 60 * 1000,
} as const;

/**
 * Dez regiões de São Paulo consultadas para montar o ranking de pontos mais quentes.
 */
export const MONITORED_POINTS: readonly MonitoredPoint[] = [
  { id: 'sp_se', name: 'Sé (Centro)', latitude: -23.5505, longitude: -46.6333 },
  { id: 'sp_paulista', name: 'Av. Paulista', latitude: -23.5614, longitude: -46.6558 },
  { id: 'sp_pinheiros', name: 'Pinheiros', latitude: -23.5673, longitude: -46.7019 },
  { id: 'sp_ibirapuera', name: 'Parque Ibirapuera', latitude: -23.5874, longitude: -46.6576 },
  { id: 'sp_mooca', name: 'Mooca', latitude: -23.5558, longitude: -46.5967 },
  { id: 'sp_tatuape', name: 'Tatuapé', latitude: -23.5403, longitude: -46.5766 },
  { id: 'sp_santana', name: 'Santana (Zona Norte)', latitude: -23.5015, longitude: -46.6248 },
  { id: 'sp_santo_amaro', name: 'Santo Amaro (Zona Sul)', latitude: -23.6528, longitude: -46.7069 },
  { id: 'sp_itaquera', name: 'Itaquera (Zona Leste)', latitude: -23.5419, longitude: -46.4556 },
  { id: 'sp_lapa', name: 'Lapa (Zona Oeste)', latitude: -23.5208, longitude: -46.7014 },
];
