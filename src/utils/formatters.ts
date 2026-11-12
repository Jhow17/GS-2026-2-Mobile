/**
 * Formatação de valores para exibição e rótulos/ícones em português do Brasil.
 * Zero emojis (M1): todos os ícones são mapeados para nomes vetoriais do Feather.
 */
import type { Amenity, PointAddress, PointStatus, PointType } from '../types/supportPoint';
import type { AirQualityIndex, AlertLevel } from '../types/weather';

/** Nome de ícone vetorial (Feather) suportado pelo AppIcon. */
export type AppIconName =
  | 'check-circle'
  | 'info'
  | 'alert-circle'
  | 'alert-triangle'
  | 'shield'
  | 'droplet'
  | 'sun'
  | 'coffee'
  | 'heart'
  | 'home'
  | 'map'
  | 'map-pin'
  | 'cloud'
  | 'cloud-rain'
  | 'wind'
  | 'thermometer'
  | 'plus-circle'
  | 'user'
  | 'log-in'
  | 'log-out'
  | 'sliders'
  | 'camera'
  | 'navigation'
  | 'clock'
  | 'phone-call'
  | 'help-circle'
  | 'edit-2'
  | 'trash-2'
  | 'check'
  | 'x'
  | 'search'
  | 'refresh-cw'
  | 'inbox'
  | 'tool'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'mail'
  | 'chevron-right'
  | 'external-link'
  | 'layers';

/** Temperatura arredondada: "32 °C". */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)} °C`;
}

/** Índice de calor com uma casa quando relevante: "38,5 °C" ou "38 °C". */
export function formatHeatIndex(celsius: number): string {
  const rounded = Math.round(celsius * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded} °C`;
  }
  return `${rounded.toFixed(1).replace('.', ',')} °C`;
}

/** Velocidade do vento convertida de m/s para km/h: "14 km/h". */
export function formatWind(metersPerSecond: number): string {
  const kmh = Math.round(metersPerSecond * 3.6);
  return `${kmh} km/h`;
}

/** Horário curto "14:00" a partir de ISO. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Data e hora legíveis: "10/11 às 14:30". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month} às ${formatTime(iso)}`;
}

/** Remove tudo que não for dígito do CEP (máx. 8 dígitos). */
export function stripCep(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/** Formata CEP no padrão "00000-000". */
export function formatCep(value: string): string {
  const digits = stripCep(value);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/** Monta o texto único de endereço a partir de PointAddress estruturado. */
export function formatStructuredAddress(addr: PointAddress): string {
  const streetPart = addr.number?.trim()
    ? `${addr.street.trim()}, ${addr.number.trim()}`
    : addr.street.trim();
  const compPart = addr.complement?.trim() ? ` (${addr.complement.trim()})` : '';
  const districtPart = addr.neighborhood?.trim() ? ` - ${addr.neighborhood.trim()}` : '';
  const cityStatePart =
    addr.city?.trim() && addr.state?.trim()
      ? `, ${addr.city.trim()}/${addr.state.trim()}`
      : addr.city?.trim()
        ? `, ${addr.city.trim()}`
        : '';
  const cepPart = addr.cep ? ` · CEP ${formatCep(addr.cep)}` : '';
  return `${streetPart}${compPart}${districtPart}${cityStatePart}${cepPart}`.trim();
}

export const alertLevelLabels: Record<AlertLevel, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  cuidado: 'Cuidado',
  perigo: 'Perigo',
  perigo_extremo: 'Perigo extremo',
};

export const alertLevelIconNames: Record<AlertLevel, AppIconName> = {
  normal: 'check-circle',
  atencao: 'info',
  cuidado: 'alert-circle',
  perigo: 'alert-triangle',
  perigo_extremo: 'shield',
};

export const pointTypeLabels: Record<PointType, string> = {
  bebedouro: 'Bebedouro',
  sombra: 'Sombra',
  descanso: 'Descanso',
  parceiro: 'Ponto parceiro',
};

export const pointTypeIconNames: Record<PointType, AppIconName> = {
  bebedouro: 'droplet',
  sombra: 'sun',
  descanso: 'coffee',
  parceiro: 'heart',
};

export const pointStatusLabels: Record<PointStatus, string> = {
  pending: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Não aprovado',
};

export const amenityLabels: Record<Amenity, string> = {
  agua_potavel: 'Água potável',
  banheiro: 'Banheiro',
  banco: 'Banco / assento',
  tomada: 'Tomada',
  sombra_coberta: 'Sombra coberta',
  ar_condicionado: 'Ar-condicionado',
};

export const airQualityLabels: Record<AirQualityIndex, string> = {
  1: 'Boa',
  2: 'Razoável',
  3: 'Moderada',
  4: 'Ruim',
  5: 'Muito ruim',
};
