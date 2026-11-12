/**
 * Seletor da sobreposição do Weather Maps 1.0 no mapa:
 * Desligado, Temperatura, Chuva, Nuvens e Vento (com ícones vetoriais e área >= 44pt).
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { WeatherTileLayer } from '../types/weather';
import type { AppIconName } from '../utils/formatters';
import { AppIcon } from './AppIcon';

interface LayerOption {
  value: WeatherTileLayer | null;
  label: string;
  icon: AppIconName;
}

const LAYER_OPTIONS: readonly LayerOption[] = [
  { value: null, label: 'Sem camada', icon: 'layers' },
  { value: 'temp_new', label: 'Calor', icon: 'thermometer' },
  { value: 'precipitation_new', label: 'Chuva', icon: 'cloud-rain' },
  { value: 'clouds_new', label: 'Nuvens', icon: 'cloud' },
  { value: 'wind_new', label: 'Vento', icon: 'wind' },
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
              accessibilityLabel={`Camada do mapa: ${option.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelectLayer(option.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <AppIcon
                name={option.icon}
                size={15}
                color={active ? colors.textOnPrimary : colors.textSecondary}
              />
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
});
