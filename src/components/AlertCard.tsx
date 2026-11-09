/**
 * Cartão do alerta: cor e ícone por nível, índice de calor, mensagem e atualização.
 */
import { StyleSheet, Text, View } from 'react-native';

import { alertColors, alertTextColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { AlertLevel } from '../types/weather';
import { alertLevelIcons, alertLevelLabels, formatHeatIndex } from '../utils/formatters';

interface AlertCardProps {
  level: AlertLevel;
  heatIndexC: number;
  message: string;
  updatedLabel: string;
}

export function AlertCard({ level, heatIndexC, message, updatedLabel }: AlertCardProps) {
  const textColor = alertTextColors[level];
  return (
    <View
      style={[styles.card, { backgroundColor: alertColors[level] }]}
      accessibilityRole="summary"
      accessibilityLabel={`Alerta ${alertLevelLabels[level]}. Índice de calor ${formatHeatIndex(heatIndexC)}. ${message}`}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{alertLevelIcons[level]}</Text>
        <Text style={[styles.level, { color: textColor }]}>{alertLevelLabels[level]}</Text>
      </View>
      <Text style={[styles.caption, { color: textColor }]}>Índice de calor</Text>
      <Text style={[styles.heatIndex, { color: textColor }]}>{formatHeatIndex(heatIndexC)}</Text>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      <Text style={[styles.updated, { color: textColor }]}>{updatedLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xxs,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    fontSize: fontSize.heading,
  },
  level: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  caption: {
    marginTop: spacing.xs,
    fontSize: fontSize.small,
    fontWeight: '500',
  },
  heatIndex: {
    fontSize: fontSize.display,
    fontWeight: '800',
  },
  message: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  updated: {
    marginTop: spacing.xs,
    fontSize: fontSize.caption,
    fontWeight: '400',
    opacity: 0.9,
  },
});
