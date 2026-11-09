/**
 * Item do ranking de pontos mais quentes da cidade.
 */
import { StyleSheet, Text, View } from 'react-native';

import { alertColors, alertTextColors, colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import type { HotSpot } from '../types/weather';
import { alertLevelLabels, formatHeatIndex, formatTemperature } from '../utils/formatters';

interface HotSpotItemProps {
  spot: HotSpot;
  position: number;
}

export function HotSpotItem({ spot, position }: HotSpotItemProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.position}>{position}º</Text>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>
        <Text style={styles.details}>
          {formatTemperature(spot.temperatureC)} · {Math.round(spot.humidity)}% de umidade
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: alertColors[spot.level] }]}>
        <Text style={[styles.badgeValue, { color: alertTextColors[spot.level] }]}>
          {formatHeatIndex(spot.heatIndexC)}
        </Text>
        <Text style={[styles.badgeLabel, { color: alertTextColors[spot.level] }]}>
          {alertLevelLabels[spot.level]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  position: {
    width: 32,
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textMuted,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  details: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textMuted,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    alignItems: 'center',
    minWidth: 88,
  },
  badgeValue: {
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  badgeLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
});
