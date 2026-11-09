/**
 * Espaçamentos (múltiplos de 4 e 8), raios, sombras e tamanhos de fonte globais.
 */
import { Platform } from 'react-native';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Sombra de cartões: iOS usa shadow*, Android usa elevation. */
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: {},
});

export const fontSize = {
  caption: 12,
  small: 14,
  body: 16,
  title: 20,
  heading: 24,
  display: 40,
} as const;
