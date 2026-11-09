/**
 * Seletor da sobreposição do Weather Maps 1.0 no mapa:
 * Desligado, Temperatura, Chuva, Nuvens e Vento.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { WeatherTileLayer } from '../types/weather';

interface LayerOption {
  value: WeatherTileLayer | null;
  label: string;
}

const LAYER_OPTIONS: readonly LayerOption[] = [
  { value: null, label: 'Sem camada' },
  { value: 'temp_new', label: '🌡️ Calor' },
  { value: 'precipitation_new', label: '🌧️ Chuva' },
  { value: 'clouds_new', label: '☁️ Nuvens' },
  { value: 'wind_new', label: '💨 Vento' },
];

interface MapLayerToggleProps {
  selectedLayer: WeatherTileLayer | null;
  onSelectLayer: (layer: WeatherTileLayer | null) => void;
  notice?: string | null;
}

export function MapLayerToggle({
  selectedLayer,
  onSelectLayer,
  notice,
}: MapLayerToggleProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {LAYER_OPTIONS.map((option) => {
          const active = selectedLayer === option.value;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelectLayer(option.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  notice: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.warning,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
});
