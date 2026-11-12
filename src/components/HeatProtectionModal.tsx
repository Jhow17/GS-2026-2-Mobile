/**
 * Modal de orientações práticas de proteção contra calor intenso (M3).
 * Exibe checklist para quem trabalha na rua, sinais de alerta de exaustão/insolação,
 * botão de emergência para o SAMU (192), atalho direto para o ponto de apoio mais
 * próximo e citação da fonte oficial (Ministério da Saúde / OMS).
 */
import { useCallback } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  HEALTH_SOURCE_CITATION,
  PROTECTION_TIP_SECTIONS,
} from '../config/heatHealthContent';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import type { SupportPoint } from '../types/supportPoint';
import { formatDistance } from '../utils/distance';
import { pointTypeLabels } from '../utils/formatters';
import { AppIcon } from './AppIcon';
import { CustomButton } from './CustomButton';

interface HeatProtectionModalProps {
  visible: boolean;
  onClose: () => void;
  nearestPoint?: {
    point: SupportPoint;
    distanceMeters: number | null;
  } | null;
  onOpenNearestPoint?: (pointId: string) => void;
}

export function HeatProtectionModal({
  visible,
  onClose,
  nearestPoint,
  onOpenNearestPoint,
}: HeatProtectionModalProps) {
  const handleCallSamu = useCallback((): void => {
    Linking.openURL('tel:192');
  }, []);

  const handleGoToNearest = useCallback((): void => {
    if (nearestPoint && onOpenNearestPoint) {
      onClose();
      onOpenNearestPoint(nearestPoint.point.id);
    }
  }, [nearestPoint, onOpenNearestPoint, onClose]);

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
          accessibilityLabel="Fechar dicas de proteção"
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AppIcon name="shield" size={22} color={colors.danger} />
              <Text style={styles.title}>Dicas para se proteger do calor</Text>
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
            {nearestPoint && onOpenNearestPoint ? (
              <View style={styles.nearestCard}>
                <View style={styles.nearestHeader}>
                  <AppIcon name="map-pin" size={18} color={colors.primary} />
                  <Text style={styles.nearestTitle}>
                    Ponto de apoio mais próximo de você
                  </Text>
                </View>
                <Text style={styles.nearestName}>
                  {nearestPoint.point.name}
                </Text>
                <Text style={styles.nearestMeta}>
                  {pointTypeLabels[nearestPoint.point.type]}
                  {nearestPoint.distanceMeters !== null
                    ? ` · a ${formatDistance(nearestPoint.distanceMeters)}`
                    : ''}{' '}
                  · {nearestPoint.point.address}
                </Text>
                <CustomButton
                  title="Ver ponto de apoio mais próximo"
                  icon="navigation"
                  compact
                  onPress={handleGoToNearest}
                  style={styles.nearestButton}
                />
              </View>
            ) : null}

            {PROTECTION_TIP_SECTIONS.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.emergencyCard}>
              <View style={styles.emergencyHeader}>
                <AppIcon
                  name="phone-call"
                  size={18}
                  color={colors.danger}
                />
                <Text style={styles.emergencyTitle}>
                  Emergência Médica (SAMU 192)
                </Text>
              </View>
              <Text style={styles.emergencyText}>
                Se você ou outro trabalhador apresentar confusão mental, pele
                muito quente e seca ou desmaio, peça socorro imediato.
              </Text>
              <CustomButton
                title="Ligar 192 (SAMU)"
                icon="phone-call"
                variant="danger"
                compact
                onPress={handleCallSamu}
              />
            </View>

            <Text style={styles.citation}>{HEALTH_SOURCE_CITATION}</Text>
          </ScrollView>

          <CustomButton
            title="Fechar orientações"
            variant="outline"
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
    maxHeight: '90%',
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
  nearestCard: {
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  nearestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nearestTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  nearestName: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  nearestMeta: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  nearestButton: {
    marginTop: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emergencyTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.danger,
  },
  emergencyText: {
    fontSize: fontSize.small,
    color: colors.text,
    lineHeight: 20,
  },
  citation: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  footerBtn: {
    marginTop: spacing.sm,
  },
});
