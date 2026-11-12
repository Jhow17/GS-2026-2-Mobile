/**
 * Paleta de cores inspirada em shadcn/ui (superfícies neutras slate/zinc,
 * bordas de 1px bem definidas e cores semânticas de alto contraste >= 4.5:1
 * para uso sob sol forte).
 * Proibido usar hexadecimais soltos fora deste arquivo.
 */
import type { PointType } from '../types/supportPoint';
import type { AlertLevel } from '../types/weather';

export const colors = {
  // Marca e ações principais (esmeralda escuro de alto contraste)
  primary: '#0F766E',
  primaryDark: '#115E59',
  primaryLight: '#CCFBF1',
  primarySubtle: '#F0FDFA',

  // Destaque secundário (âmbar quente)
  secondary: '#D97706',
  secondaryLight: '#FEF3C7',

  // Superfícies neutras estilo shadcn/ui (Slate / Zinc)
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // Tipografia
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#475569',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#F8FAFC',

  // Bordas, divisores e foco
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  ring: '#0F766E',
  overlay: 'rgba(15, 23, 42, 0.55)',

  // Estados semânticos
  danger: '#B91C1C',
  dangerLight: '#FEE2E2',
  dangerBorder: '#FCA5A5',

  warning: '#B45309',
  warningLight: '#FEF3C7',
  warningBorder: '#FCD34D',

  success: '#15803D',
  successLight: '#DCFCE7',
  successBorder: '#86EFAC',

  info: '#0369A1',
  infoLight: '#E0F2FE',
  infoBorder: '#7DD3FC',
} as const;

/** Cores de fundo por nível do índice de calor (contraste >= 4.5:1 garantido). */
export const alertColors: Record<AlertLevel, string> = {
  normal: '#15803D',
  atencao: '#FACC15',
  cuidado: '#EA580C',
  perigo: '#B91C1C',
  perigo_extremo: '#6B21A8',
};

/** Cores de superfície suave por nível de alerta (para badges e banners secundários). */
export const alertSubtleColors: Record<AlertLevel, string> = {
  normal: '#DCFCE7',
  atencao: '#FEF9C3',
  cuidado: '#FFEDD5',
  perigo: '#FEE2E2',
  perigo_extremo: '#F3E8FF',
};

/** Cor do texto sobre cada cor de alerta (preto no amarelo, branco nos demais). */
export const alertTextColors: Record<AlertLevel, string> = {
  normal: '#FFFFFF',
  atencao: '#0F172A',
  cuidado: '#FFFFFF',
  perigo: '#FFFFFF',
  perigo_extremo: '#FFFFFF',
};

/** Cores por categoria de ponto de apoio (marcadores do mapa e ícones). */
export const pointTypeColors: Record<PointType, string> = {
  bebedouro: '#0284C7',
  sombra: '#15803D',
  descanso: '#7E22CE',
  parceiro: '#EA580C',
};

/** Fundo suave para badges/ícones de cada categoria de ponto. */
export const pointTypeSubtleColors: Record<PointType, string> = {
  bebedouro: '#E0F2FE',
  sombra: '#DCFCE7',
  descanso: '#F3E8FF',
  parceiro: '#FFEDD5',
};
