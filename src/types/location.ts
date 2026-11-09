/**
 * Tipos de localização e estado formal da permissão.
 */

/**
 * - undetermined: ainda não perguntamos;
 * - granted: concedida;
 * - denied: negada, mas ainda podemos perguntar de novo;
 * - blocked: negada sem possibilidade de perguntar (só pelas configurações);
 * - services_disabled: GPS/serviço de localização do aparelho desligado.
 */
export type LocationPermissionState =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'services_disabled';

export interface Coordinates {
  latitude: number;
  longitude: number;
}
