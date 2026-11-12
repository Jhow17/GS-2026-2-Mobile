/**
 * Item de lista de ponto de apoio: ícone vetorial por categoria, nome,
 * endereço curto, distância e tags de status ("Aberto agora" / relatos).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { SupportPoint } from '../types/supportPoint';
import { formatDistance } from '../utils/distance';
import { pointTypeIconNames, pointTypeLabels } from '../utils/formatters';
import { isOpenNow } from '../utils/time';
import { AppIcon } from './AppIcon';

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
      accessibilityLabel={`${pointTypeLabels[point.type]} ${point.name}${distanceMeters !== null ? `, a ${formatDistance(distanceMeters)}` : ''}`}
      onPress={() => onPress(point)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: pointTypeColors[point.type] },
        ]}
      >
        <AppIcon
          name={pointTypeIconNames[point.type]}
          size={22}
          color={colors.textOnPrimary}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {point.name}
        </Text>
        <Text style={styles.type} numberOfLines={1}>
          {pointTypeLabels[point.type]}
          {distanceMeters !== null ? ` · ${formatDistance(distanceMeters)}` : ''}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {point.address}
        </Text>
        <View style={styles.tags}>
          <View style={[styles.tag, openNow ? styles.open : styles.closed]}>
            <Text
              style={[
                styles.tagText,
                openNow ? styles.openText : styles.closedText,
              ]}
            >
              {openNow ? 'Aberto agora' : 'Fechado'}
            </Text>
          </View>
          {reportCount > 0 ? (
            <View style={[styles.tag, styles.warning]}>
              <AppIcon
                name="alert-triangle"
                size={12}
                color={colors.warning}
              />
              <Text style={[styles.tagText, styles.warningText]}>
                {reportCount} relato(s)
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <AppIcon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    ...cardShadow,
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  pressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  type: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.primary,
  },
  address: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textMuted,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  tagText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  open: {
    backgroundColor: colors.successLight,
  },
  openText: {
    color: colors.success,
  },
  closed: {
    backgroundColor: colors.surfaceMuted,
  },
  closedText: {
    color: colors.textMuted,
  },
  warning: {
    backgroundColor: colors.warningLight,
  },
  warningText: {
    color: colors.warning,
  },
});
