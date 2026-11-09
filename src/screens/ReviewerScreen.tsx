/**
 * Tela Modo avaliador (demonstração da moderação).
 * Mostra o checklist informativo de critérios, a lista de pontos em análise
 * (foto, dados, distância até o avaliador, "Aprovar" e "Rejeitar" com motivo
 * escolhido entre opções prontas ou digitado) e a lista de relatos abertos
 * com "Marcar como resolvido".
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FormField } from '../components/FormField';
import { Loading } from '../components/Loading';
import { DEFAULT_REGION } from '../config/appConfig';
import { useLocation } from '../hooks/useLocation';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { FountainReport } from '../types/report';
import type { SupportPoint } from '../types/supportPoint';
import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import {
  formatCoordinates,
  formatDateTime,
  pointTypeIcons,
  pointTypeLabels,
} from '../utils/formatters';

const APPROVAL_CRITERIA: readonly string[] = [
  'Localização confere com a descrição',
  'Acesso público e gratuito para trabalhadores',
  'Foto nítida que permite reconhecer o ponto',
  'Não é duplicata de um ponto já aprovado',
  'Responsável identificado pelo envio',
];

const REJECTION_REASONS: readonly string[] = [
  'Foto pouco nítida ou não mostra o local',
  'Ponto duplicado já existente no mapa',
  'Local privado sem acesso público',
  'Descrição ou coordenadas inconsistentes',
];

export function ReviewerScreen() {
  const { coordinates } = useLocation();
  const {
    points,
    pendingPoints,
    openReports,
    loading,
    error,
    reload,
    changeStatus,
    resolveReport,
  } = useSupportPoints();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingPoint, setRejectingPoint] = useState<SupportPoint | null>(null);
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>(
    REJECTION_REASONS[0] ?? '',
  );
  const [customReason, setCustomReason] = useState('');

  const referenceCoords = useMemo(
    () =>
      coordinates ?? {
        latitude: DEFAULT_REGION.latitude,
        longitude: DEFAULT_REGION.longitude,
      },
    [coordinates],
  );

  /** Mapa rápido id -> nome do ponto para exibir nos relatos. */
  const pointNamesById = useMemo<Record<string, string>>(() => {
    const all = [...points, ...pendingPoints];
    return all.reduce<Record<string, string>>(
      (acc, point) => ({ ...acc, [point.id]: point.name }),
      {},
    );
  }, [points, pendingPoints]);

  const handleApprove = useCallback(
    async (point: SupportPoint): Promise<void> => {
      setBusyId(point.id);
      try {
        await changeStatus(point.id, 'aprovado');
      } catch {
        Alert.alert('Atenção', 'Não foi possível aprovar este envio agora.');
      } finally {
        setBusyId(null);
      }
    },
    [changeStatus],
  );

  const handleOpenRejectModal = useCallback((point: SupportPoint): void => {
    setRejectingPoint(point);
    setSelectedPresetReason(REJECTION_REASONS[0] ?? '');
    setCustomReason('');
  }, []);

  const handleConfirmReject = useCallback(async (): Promise<void> => {
    if (!rejectingPoint) {
      return;
    }
    const reason = customReason.trim().length > 0 ? customReason.trim() : selectedPresetReason;
    if (reason.length < 3) {
      Alert.alert('Atenção', 'Escolha ou digite o motivo da rejeição.');
      return;
    }

    setBusyId(rejectingPoint.id);
    try {
      await changeStatus(rejectingPoint.id, 'rejeitado', reason);
      setRejectingPoint(null);
    } catch {
      Alert.alert('Atenção', 'Não foi possível rejeitar este envio agora.');
    } finally {
      setBusyId(null);
    }
  }, [changeStatus, customReason, rejectingPoint, selectedPresetReason]);

  const handleResolveReport = useCallback(
    async (report: FountainReport): Promise<void> => {
      setBusyId(report.id);
      try {
        await resolveReport(report.id);
      } catch {
        Alert.alert('Atenção', 'Não foi possível marcar o relato como resolvido.');
      } finally {
        setBusyId(null);
      }
    },
    [resolveReport],
  );

  // Estado 1: Carregando.
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Carregando fila de avaliação..." />
      </SafeAreaView>
    );
  }

  // Estado 2: Erro.
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  // Estado 3: Vazio ("Nada para avaliar").
  if (pendingPoints.length === 0 && openReports.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.criteriaCard}>
            <Text style={styles.criteriaTitle}>Checklist de critérios de aprovação</Text>
            {APPROVAL_CRITERIA.map((item) => (
              <Text key={item} style={styles.criteriaItem}>
                ☑️ {item}
              </Text>
            ))}
          </View>
          <EmptyState
            icon="✅"
            title="Nada para avaliar"
            message="Todos os pontos enviados e relatos de bebedouros já foram revisados."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.criteriaCard}>
          <Text style={styles.criteriaTitle}>Checklist de critérios de aprovação</Text>
          {APPROVAL_CRITERIA.map((item) => (
            <Text key={item} style={styles.criteriaItem}>
              ☑️ {item}
            </Text>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          Pontos em análise ({pendingPoints.length})
        </Text>
        {pendingPoints.length === 0 ? (
          <Text style={styles.emptySectionText}>Nenhum ponto aguardando aprovação.</Text>
        ) : (
          pendingPoints.map((point) => {
            const distance = calculateDistanceMeters(referenceCoords, point);
            const isBusy = busyId === point.id;
            return (
              <View key={point.id} style={styles.card}>
                <Text style={styles.pointName}>
                  {pointTypeIcons[point.type]} {point.name}
                </Text>
                <Text style={styles.meta}>
                  {pointTypeLabels[point.type]} · {formatDistance(distance)} de você · Enviado por{' '}
                  {point.ownerName}
                </Text>

                {point.photoUri ? (
                  <Image source={{ uri: point.photoUri }} style={styles.photo} />
                ) : null}

                <Text style={styles.description}>{point.description}</Text>
                <Text style={styles.meta}>
                  📍 {formatCoordinates(point.latitude, point.longitude)} ·{' '}
                  {point.is24h ? '24h' : `${point.opensAt}–${point.closesAt}`}
                </Text>
                <Text style={styles.meta}>
                  Comodidades: {point.hasShade ? 'Sombra ' : ''}
                  {point.hasColdWater ? '· Água gelada ' : ''}
                  {point.hasSeating ? '· Assentos' : ''}
                </Text>

                <View style={styles.actionsRow}>
                  <CustomButton
                    title="Aprovar"
                    compact
                    loading={isBusy}
                    onPress={() => handleApprove(point)}
                    style={styles.actionButton}
                  />
                  <CustomButton
                    title="Rejeitar"
                    variant="danger"
                    compact
                    disabled={isBusy}
                    onPress={() => handleOpenRejectModal(point)}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>
          Relatos abertos ({openReports.length})
        </Text>
        {openReports.length === 0 ? (
          <Text style={styles.emptySectionText}>Nenhum relato de problema em aberto.</Text>
        ) : (
          openReports.map((report) => {
            const isBusy = busyId === report.id;
            const pointName = pointNamesById[report.pointId] ?? 'Bebedouro';
            return (
              <View key={report.id} style={styles.card}>
                <Text style={styles.pointName}>🚰 {pointName}</Text>
                <Text style={styles.meta}>
                  Relatado por {report.authorName} em {formatDateTime(report.createdAt)}
                </Text>
                {report.photoUri ? (
                  <Image source={{ uri: report.photoUri }} style={styles.photo} />
                ) : null}
                <Text style={styles.description}>{report.description}</Text>
                <CustomButton
                  title="Marcar como resolvido"
                  variant="outline"
                  compact
                  loading={isBusy}
                  onPress={() => handleResolveReport(report)}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={rejectingPoint !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectingPoint(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.dismissArea}
            onPress={() => setRejectingPoint(null)}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Motivo da rejeição</Text>
            <Text style={styles.modalSubtitle}>
              Escolha uma opção pronta ou escreva o motivo para orientar quem enviou:
            </Text>

            {REJECTION_REASONS.map((reason) => {
              const selected =
                selectedPresetReason === reason && customReason.trim().length === 0;
              return (
                <Pressable
                  key={reason}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSelectedPresetReason(reason);
                    setCustomReason('');
                  }}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                >
                  <Text
                    style={[styles.reasonText, selected && styles.reasonTextSelected]}
                  >
                    {reason}
                  </Text>
                </Pressable>
              );
            })}

            <FormField
              label="Ou digite outro motivo"
              placeholder="Explique por que o ponto não pôde ser aprovado"
              value={customReason}
              onChangeText={setCustomReason}
              maxLength={140}
            />

            <View style={styles.actionsRow}>
              <CustomButton
                title="Cancelar"
                variant="outline"
                onPress={() => setRejectingPoint(null)}
                style={styles.actionButton}
              />
              <CustomButton
                title="Confirmar rejeição"
                variant="danger"
                onPress={handleConfirmReject}
                loading={busyId !== null}
                style={styles.actionButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  criteriaCard: {
    backgroundColor: colors.infoLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.info,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  criteriaTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  criteriaItem: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  emptySectionText: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow,
  },
  pointName: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  photo: {
    width: '100%',
    height: 168,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  description: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  reasonOption: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reasonOptionSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  reasonText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.text,
  },
  reasonTextSelected: {
    fontWeight: '700',
    color: colors.danger,
  },
});
