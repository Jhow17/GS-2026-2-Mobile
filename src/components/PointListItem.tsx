/**
 * Item de lista de ponto de apoio: tipo, nome, distância e "aberto agora".
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { SupportPoint } from '../types/supportPoint';
import { formatDistance } from '../utils/distance';
import { pointTypeIcons, pointTypeLabels } from '../utils/formatters';
import { isOpenNow } from '../utils/time';

interface PointListItemProps {
  point: SupportPoint;
  distanceMeters: number | null;
  onPress: (point: SupportPoint) => void;
  reportCount?: number;
  selected?: boolean;
}

export function PointListItem({
  point,
  distanceMeters,
  onPress,
  reportCount = 0,
  selected = false,
}: PointListItemProps) {
  const openNow = isOpenNow(point, new Date());
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pointTypeLabels[point.type]} ${point.name}`}
      onPress={() => onPress(point)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: pointTypeColors[point.type] }]}>
        <Text style={styles.icon}>{pointTypeIcons[point.type]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {point.name}
        </Text>
        <Text style={styles.type}>
          {pointTypeLabels[point.type]}
          {distanceMeters !== null ? ` · ${formatDistance(distanceMeters)}` : ''}
        </Text>
        <View style={styles.tags}>
          <Text style={[styles.tag, openNow ? styles.open : styles.closed]}>
            {openNow ? 'Aberto agora' : 'Fechado'}
          </Text>
          {reportCount > 0 ? (
            <Text style={[styles.tag, styles.warning]}>⚠️ {reportCount} relato(s)</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    ...cardShadow,
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: fontSize.heading,
  },
  info: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  type: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  open: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
  },
  closed: {
    backgroundColor: colors.border,
    color: colors.textMuted,
  },
  warning: {
    backgroundColor: colors.warningLight,
    color: colors.warning,
  },
});
