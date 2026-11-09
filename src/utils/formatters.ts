/**
 * Formatação de datas, temperaturas e rótulos em português.
 */
import type { ReportStatus } from '../types/report';
import type { SupportPointStatus, SupportPointType } from '../types/supportPoint';
import type { AirQualityIndex, AlertLevel, HeatTrend } from '../types/weather';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function toDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14:30" a partir de um texto ISO. */
export function formatTime(iso: string): string {
  const date = toDate(iso);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '--:--';
}

/** "09/11 14:30" a partir de um texto ISO. */
export function formatDateTime(iso: string): string {
  const date = toDate(iso);
  if (!date) {
    return '--';
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${formatTime(iso)}`;
}

/** "34 °C" (arredondado para inteiro). */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)} °C`;
}

/** "41,1 °C" (uma casa decimal, usado no índice de calor). */
export function formatHeatIndex(celsius: number): string {
  return `${celsius.toFixed(1).replace('.', ',')} °C`;
}

/** "12 km/h" a partir de m/s. */
export function formatWind(speedMs: number): string {
  return `${Math.round(speedMs * 3.6)} km/h`;
}

/** "-23.55050, -46.63330" (endereço aproximado por coordenadas). */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export const pointTypeLabels: Record<SupportPointType, string> = {
  bebedouro: 'Bebedouro',
  descanso: 'Descanso',
  sombra: 'Sombra',
  outro: 'Outro',
};

export const pointStatusLabels: Record<SupportPointStatus, string> = {
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  desativado: 'Desativado',
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  aberto: 'Aberto',
  resolvido: 'Resolvido',
};

export const alertLevelLabels: Record<AlertLevel, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  cuidado: 'Cuidado',
  perigo: 'Perigo',
  perigo_extremo: 'Perigo extremo',
};

export const airQualityLabels: Record<AirQualityIndex, string> = {
  1: 'Boa',
  2: 'Razoável',
  3: 'Moderada',
  4: 'Ruim',
  5: 'Muito ruim',
};

export const heatTrendLabels: Record<HeatTrend, string> = {
  subindo: 'Calor subindo',
  estavel: 'Calor estável',
  caindo: 'Calor caindo',
};

/** Ícones (emoji) por nível, para não depender de bibliotecas extras. */
export const alertLevelIcons: Record<AlertLevel, string> = {
  normal: '🙂',
  atencao: '💧',
  cuidado: '⚠️',
  perigo: '🔥',
  perigo_extremo: '🚨',
};

export const pointTypeIcons: Record<SupportPointType, string> = {
  bebedouro: '🚰',
  descanso: '🪑',
  sombra: '🌳',
  outro: '📍',
};

export const heatTrendIcons: Record<HeatTrend, string> = {
  subindo: '↑',
  estavel: '→',
  caindo: '↓',
};
