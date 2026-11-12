/**
 * Cartão do alerta de calor: cor e ícone vetorial por nível, índice de calor,
 * botão "O que é o índice de calor?" (M2) e botão "Dicas para se proteger" (M3).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shouldShowProtectionTips } from '../config/heatHealthContent';
import { alertColors, alertTextColors, colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { SupportPoint } from '../types/supportPoint';
import type { AlertLevel } from '../types/weather';
import {
  alertLevelIconNames,
  alertLevelLabels,
  formatHeatIndex,
} from '../utils/formatters';
import { AppIcon } from './AppIcon';
import { HeatIndexInfoModal } from './HeatIndexInfoModal';
import { HeatProtectionModal } from './HeatProtectionModal';

interface AlertCardProps {
  level: AlertLevel;
  heatIndexC: number;
  message: string;
  updatedLabel: string;
  nearestPoint?: {
    point: SupportPoint;
    distanceMeters: number | null;
  } | null;
  onOpenNearestPoint?: (pointId: string) => void;
}

export function AlertCard({
  level,
  heatIndexC,
  message,
  updatedLabel,
  nearestPoint,
  onOpenNearestPoint,
}: AlertCardProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const textColor = alertTextColors[level];
  const showProtectionButton = shouldShowProtectionTips(level);
  const isLightText = textColor === '#FFFFFF';

  return (
    <View
      style={[styles.card, { backgroundColor: alertColors[level] }]}
      accessibilityRole="summary"
      accessibilityLabel={`Alerta ${alertLevelLabels[level]}. Índice de calor ${formatHeatIndex(heatIndexC)}. ${message}`}
    >
      <View style={styles.topRow}>
        <View style={styles.headerBadge}>
          <AppIcon
            name={alertLevelIconNames[level]}
            size={20}
            color={textColor}
          />
          <Text style={[styles.level, { color: textColor }]}>
            {alertLevelLabels[level]}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="O que é o índice de calor?"
          onPress={() => setInfoOpen(true)}
          style={[
            styles.infoPill,
            {
              backgroundColor: isLightText
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(15, 23, 42, 0.1)',
              borderColor: isLightText
                ? 'rgba(255, 255, 255, 0.35)'
                : 'rgba(15, 23, 42, 0.25)',
            },
          ]}
        >
          <AppIcon name="help-circle" size={15} color={textColor} />
          <Text style={[styles.infoPillText, { color: textColor }]}>
            O que é o índice?
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.caption, { color: textColor }]}>
        Índice de calor agora
      </Text>
      <Text style={[styles.heatIndex, { color: textColor }]}>
        {formatHeatIndex(heatIndexC)}
      </Text>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      <Text style={[styles.updated, { color: textColor }]}>{updatedLabel}</Text>

      {showProtectionButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dicas para se proteger do calor"
          onPress={() => setTipsOpen(true)}
          style={({ pressed }) => [
            styles.protectionButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="shield" size={18} color={colors.text} />
          <Text style={styles.protectionButtonText}>
            Dicas para se proteger
          </Text>
          <AppIcon name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <HeatIndexInfoModal
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      <HeatProtectionModal
        visible={tipsOpen}
        onClose={() => setTipsOpen(false)}
        nearestPoint={nearestPoint}
        onOpenNearestPoint={onOpenNearestPoint}
      />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  level: {
    fontSize: fontSize.title,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  infoPillText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  caption: {
    marginTop: spacing.xxs,
    fontSize: fontSize.small,
    fontWeight: '600',
    opacity: 0.92,
  },
  heatIndex: {
    fontSize: fontSize.display,
    fontWeight: '800',
  },
  message: {
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 22,
  },
  updated: {
    marginTop: spacing.xxs,
    fontSize: fontSize.caption,
    fontWeight: '500',
    opacity: 0.9,
  },
  protectionButton: {
    marginTop: spacing.sm,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  protectionButtonText: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  pressed: {
    opacity: 0.9,
  },
});
