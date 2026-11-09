/**
 * Paleta global do CitizenTech, incluindo as cores dos cinco níveis de alerta.
 */
import type { AlertLevel } from '../types/weather';
import type { SupportPointStatus, SupportPointType } from '../types/supportPoint';

export const colors = {
  primary: '#0B6E4F',
  primaryDark: '#08513A',
  primaryLight: '#E3F4EC',
  secondary: '#F28C28',
  background: '#F5F7F6',
  surface: '#FFFFFF',
  text: '#1C2421',
  textMuted: '#5C6B66',
  textOnPrimary: '#FFFFFF',
  border: '#D9E0DD',
  danger: '#C62828',
  dangerLight: '#FDECEA',
  warning: '#B26A00',
  warningLight: '#FFF4E0',
  info: '#1565C0',
  infoLight: '#E3F0FC',
  disabled: '#A9B4B0',
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

/** Cores de fundo dos cinco níveis de alerta. */
export const alertColors: Record<AlertLevel, string> = {
  normal: '#2E7D32',
  atencao: '#F9A825',
  cuidado: '#EF6C00',
  perigo: '#C62828',
  perigo_extremo: '#6A1B9A',
};

/** Cor do texto sobre cada nível (garante contraste). */
export const alertTextColors: Record<AlertLevel, string> = {
  normal: '#FFFFFF',
  atencao: '#1C2421',
  cuidado: '#FFFFFF',
  perigo: '#FFFFFF',
  perigo_extremo: '#FFFFFF',
};

/** Cor dos marcadores por tipo de ponto. */
export const pointTypeColors: Record<SupportPointType, string> = {
  bebedouro: '#1565C0',
  descanso: '#6D4C41',
  sombra: '#2E7D32',
  outro: '#757575',
};

/** Cor dos selos de status. */
export const statusColors: Record<SupportPointStatus, string> = {
  em_analise: '#B26A00',
  aprovado: '#2E7D32',
  rejeitado: '#C62828',
  desativado: '#757575',
};
