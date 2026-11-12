/**
 * Escala de espaçamento (múltiplos de 4), raios de borda, tamanhos de fonte
 * e sombras sutis inspiradas no shadcn/ui.
 */
import type { ViewStyle } from 'react-native';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 14,
  body: 16,
  title: 18,
  heading: 22,
  display: 34,
} as const;

/** Sombra sutil de cartão estilo shadcn/ui (combinada com borderWidth: 1). */
export const cardShadow: ViewStyle = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};
