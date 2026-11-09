/**
 * Resumo do clima atual: temperatura, sensação térmica, umidade e vento.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { WeatherReading } from '../types/weather';
import { formatTemperature, formatWind } from '../utils/formatters';

interface WeatherSummaryProps {
  reading: WeatherReading;
}

interface SummaryItem {
  label: string;
  value: string;
}

export function WeatherSummary({ reading }: WeatherSummaryProps) {
  const items: SummaryItem[] = [
    { label: 'Temperatura', value: formatTemperature(reading.temperatureC) },
    { label: 'Sensação', value: formatTemperature(reading.feelsLikeC) },
    { label: 'Umidade', value: `${Math.round(reading.humidity)}%` },
    { label: 'Vento', value: formatWind(reading.windSpeedMs) },
  ];

  return (
    <View style={styles.card}>
      {reading.description ? (
        <Text style={styles.description}>{reading.description}</Text>
      ) : null}
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...cardShadow,
  },
  description: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
