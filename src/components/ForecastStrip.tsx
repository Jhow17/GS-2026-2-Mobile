/**
 * Faixa horizontal da previsão, colorida pelo nível de alerta de cada faixa.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { alertColors, alertTextColors, colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import type { ForecastHeatSlot } from '../types/weather';
import { formatHeatIndex, formatTemperature, formatTime } from '../utils/formatters';

interface ForecastStripProps {
  slots: ForecastHeatSlot[];
}

export function ForecastStrip({ slots }: ForecastStripProps) {
  if (slots.length === 0) {
    return <Text style={styles.empty}>Previsão indisponível no momento.</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {slots.map((slot) => {
        const textColor = alertTextColors[slot.level];
        return (
          <View
            key={slot.at}
            style={[styles.slot, { backgroundColor: alertColors[slot.level] }]}
            accessibilityLabel={`${formatTime(slot.at)}: índice de calor ${formatHeatIndex(slot.heatIndexC)}`}
          >
            <Text style={[styles.time, { color: textColor }]}>{formatTime(slot.at)}</Text>
            <Text style={[styles.heat, { color: textColor }]}>
              {Math.round(slot.heatIndexC)}°
            </Text>
            <Text style={[styles.temp, { color: textColor }]}>
              {formatTemperature(slot.temperatureC)}
            </Text>
            <Text style={[styles.temp, { color: textColor }]}>{Math.round(slot.humidity)}%</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  slot: {
    width: 72,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  time: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  heat: {
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  temp: {
    fontSize: fontSize.caption,
    fontWeight: '500',
  },
  empty: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
