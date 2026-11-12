/**
 * Componente de ícone vetorial padronizado (baseado em @expo/vector-icons/Feather).
 * Substitui integralmente o uso de emojis na interface (M1).
 */
import { Feather } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '../theme/colors';
import type { AppIconName } from '../utils/formatters';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppIcon({
  name,
  size = 20,
  color = colors.text,
  style,
}: AppIconProps) {
  return <Feather name={name} size={size} color={color} style={style} />;
}
