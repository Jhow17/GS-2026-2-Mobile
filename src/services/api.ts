/**
 * Instância única do axios para a OpenWeather.
 * - A chave e os parâmetros comuns entram em params pelo interceptor (nunca na URL).
 * - O log mostra só método, config.url e status: nunca a chave nem os parâmetros.
 */
import axios, { AxiosError } from 'axios';

import { OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL } from '../config/appConfig';
import { isRecord } from '../utils/validation';

export const api = axios.create({
  baseURL: OPENWEATHER_BASE_URL,
  timeout: 10000,
});

// Interceptor de requisição: cabeçalho do app, parâmetros comuns e log seguro.
api.interceptors.request.use((config) => {
  config.headers.set('X-App-Name', 'CitizenTech');

  const currentParams: unknown = config.params;
  config.params = {
    ...(isRecord(currentParams) ? currentParams : {}),
    appid: OPENWEATHER_API_KEY,
    units: 'metric',
    lang: 'pt_br',
  };

  console.log(`[API] ${(config.method ?? 'get').toUpperCase()} ${config.url ?? ''}`);
  return config;
});

// Interceptor de resposta: registra status (sucesso ou erro) sem dados sensíveis.
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API] ${(response.config.method ?? 'get').toUpperCase()} ${response.config.url ?? ''} ${response.status}`,
    );
    return response;
  },
  (error: unknown) => {
    if (error instanceof AxiosError) {
      const method = (error.config?.method ?? 'get').toUpperCase();
      const url = error.config?.url ?? '';
      const status = error.response?.status ?? 'sem resposta';
      console.log(`[API] ${method} ${url} ${status}`);
    }
    return Promise.reject(error);
  },
);
