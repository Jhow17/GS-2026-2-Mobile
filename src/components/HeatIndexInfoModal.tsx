/**
 * Modal educativo explicando o Índice de Calor, a diferença para Temperatura
 * e Sensação Térmica e a tabela das 5 faixas de alerta (M2).
 */
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  HEAT_COMPARISONS,
  HEAT_INDEX_INTRO,
  HEAT_SCALE_LEVELS,
} from '../config/heatHealthContent';
import { alertColors, alertTextColors, colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import { alertLevelIconNames } from '../utils/formatters';
import { AppIcon } from './AppIcon';
import { CustomButton } from './CustomButton';

interface HeatIndexInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HeatIndexInfoModal({
  visible,
  onClose,
}: HeatIndexInfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar explicação do índice de calor"
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AppIcon name="thermometer" size={22} color={colors.primary} />
              <Text style={styles.title}>{HEAT_INDEX_INTRO.title}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <AppIcon name="x" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.summary}>{HEAT_INDEX_INTRO.summary}</Text>

            <View style={styles.workerCallout}>
              <AppIcon name="info" size={18} color={colors.primary} />
              <Text style={styles.workerCalloutText}>
                {HEAT_INDEX_INTRO.workerNote}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Diferença entre os indicadores
            </Text>
            {HEAT_COMPARISONS.map((item) => (
              <View key={item.title} style={styles.comparisonCard}>
                <Text style={styles.comparisonTitle}>{item.title}</Text>
                <Text style={styles.comparisonDescription}>
                  {item.description}
                </Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>
              As 5 faixas de alerta do CitizenTech
            </Text>
            {HEAT_SCALE_LEVELS.map((scale) => {
              const bg = alertColors[scale.level];
              const fg = alertTextColors[scale.level];
              return (
                <View key={scale.level} style={styles.scaleCard}>
                  <View style={[styles.scaleBadge, { backgroundColor: bg }]}>
                    <AppIcon
                      name={alertLevelIconNames[scale.level]}
                      size={16}
                      color={fg}
                    />
                    <Text style={[styles.scaleBadgeText, { color: fg }]}>
                      {scale.label}
                    </Text>
                  </View>
                  <Text style={styles.scaleRange}>
                    Público geral: {scale.generalRangeLabel} · Trabalho na rua:{' '}
                    {scale.workerRangeLabel}
                  </Text>
                  <Text style={styles.scaleMeaning}>{scale.meaning}</Text>
                  <Text style={styles.scaleAction}>
                    O que fazer: {scale.recommendedAction}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <CustomButton
            title="Entendi"
            onPress={onClose}
            style={styles.footerBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  scrollContent: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  summary: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  workerCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  workerCalloutText: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  comparisonCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  comparisonTitle: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  comparisonDescription: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  scaleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  scaleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  scaleBadgeText: {
    fontSize: fontSize.small,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scaleRange: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
  scaleMeaning: {
    fontSize: fontSize.small,
    color: colors.text,
  },
  scaleAction: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  footerBtn: {
    marginTop: spacing.sm,
  },
});
