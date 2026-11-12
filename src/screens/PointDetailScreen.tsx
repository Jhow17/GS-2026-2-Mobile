/**
 * Detalhes de um ponto de apoio (M1, M6, M7):
 * - Qualquer visitante pode ver todas as informações e traçar rota;
 * - Para reportar um problema no ponto, exige usuário logado (se visitante,
 *   redireciona ao Login e retorna automaticamente com o formulário aberto);
 * - O autor do ponto ou o Administrador podem ativar/desativar o espaço;
 * - O Administrador conta ainda com atalho direto para editar o ponto.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppIcon } from '../components/AppIcon';
import { CameraCapture } from '../components/CameraCapture';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList } from '../types/navigation';
import {
  amenityLabels,
  formatDateTime,
  pointStatusLabels,
  pointTypeIconNames,
  pointTypeLabels,
} from '../utils/formatters';
import { isOpenNow } from '../utils/time';
import { validateReportInput } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'PointDetail'>;

export function PointDetailScreen({ route, navigation }: Props) {
  const { pointId, openReportForm } = route.params;
  const { points, reports, toggleActive, reportDefect } = useSupportPoints();
  const { session, isAdmin } = useAuth();
  const { profile } = useProfile();

  const [reportOpen, setReportOpen] = useState(Boolean(openReportForm));
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string | undefined>(undefined);
  const [reportErrors, setReportErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (openReportForm && session) {
      setReportOpen(true);
    }
  }, [openReportForm, session]);

  const point = useMemo(
    () => points.find((item) => item.id === pointId),
    [points, pointId],
  );

  const activeReports = useMemo(
    () =>
      reports.filter(
        (report) => report.pointId === pointId && report.status === 'open',
      ),
    [reports, pointId],
  );

  const isOwner = Boolean(
    point && session && point.createdBy === session.userId,
  );
  const canManageActivation = Boolean(point && (isOwner || isAdmin));

  const handleOpenDirections = useCallback(async (): Promise<void> => {
    if (!point) {
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Atenção',
        'Não foi possível abrir o aplicativo de mapas neste aparelho.',
      );
    }
  }, [point]);

  const handleToggleActive = useCallback(async (): Promise<void> => {
    if (!point || !session) {
      return;
    }
    try {
      await toggleActive(point.id, !point.active, session.name);
    } catch {
      Alert.alert('Atenção', 'Não foi possível atualizar o ponto agora.');
    }
  }, [point, session, toggleActive]);

  const handleStartReport = useCallback((): void => {
    if (!point) {
      return;
    }
    if (!session || !profile) {
      navigation.navigate('Login', {
        redirectTo: {
          target: 'PointDetail',
          params: { pointId: point.id, openReportForm: true },
        },
        reasonMessage:
          'Entre na sua conta para relatar um problema neste ponto de apoio.',
      });
      return;
    }
    setReportOpen((prev) => !prev);
    setReportErrors({});
  }, [point, session, profile, navigation]);

  const handleSendReport = useCallback(async (): Promise<void> => {
    if (!point || !profile) {
      return;
    }
    const input = {
      pointId: point.id,
      pointName: point.name,
      description: reportText,
      photoUri: reportPhoto,
    };
    const validation = validateReportInput(input);
    if (!validation.valid) {
      setReportErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await reportDefect(input, profile);
      setReportText('');
      setReportPhoto(undefined);
      setReportErrors({});
      setReportOpen(false);
      Alert.alert(
        'Relato registrado',
        'Obrigado por avisar! O problema foi encaminhado para verificação.',
      );
    } catch {
      Alert.alert(
        'Atenção',
        'Não foi possível enviar o relato. Tente de novo.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [point, profile, reportText, reportPhoto, reportDefect]);

  if (!point) {
    return (
      <EmptyState
        icon="map-pin"
        title="Ponto não encontrado"
        message="Este ponto pode ter sido removido."
        actionLabel="Voltar"
        onAction={() => navigation.goBack()}
      />
    );
  }

  const openNow = isOpenNow(point, new Date());
  const scheduleLabel = point.is24h
    ? 'Aberto 24 horas'
    : `Das ${point.opensAt} às ${point.closesAt}`;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: pointTypeColors[point.type] },
            ]}
          >
            <AppIcon
              name={pointTypeIconNames[point.type]}
              size={24}
              color={colors.textOnPrimary}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.type}>{pointTypeLabels[point.type]}</Text>
            <Text style={styles.name}>{point.name}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              openNow && point.active ? styles.badgeOpen : styles.badgeClosed,
            ]}
          >
            <AppIcon
              name="clock"
              size={13}
              color={
                openNow && point.active ? colors.success : colors.textMuted
              }
            />
            <Text
              style={[
                styles.badgeText,
                openNow && point.active
                  ? styles.badgeOpenText
                  : styles.badgeClosedText,
              ]}
            >
              {!point.active
                ? 'Desativado temporariamente'
                : openNow
                  ? 'Aberto agora'
                  : 'Fechado agora'}
            </Text>
          </View>

          {point.status !== 'approved' ? (
            <View style={[styles.badge, styles.badgePending]}>
              <Text style={[styles.badgeText, styles.badgePendingText]}>
                {pointStatusLabels[point.status]}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.description}>{point.description}</Text>

        <View style={styles.infoBlock}>
          <View style={styles.infoTitleRow}>
            <AppIcon name="map-pin" size={14} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Endereço</Text>
          </View>
          <Text style={styles.infoValue}>{point.address}</Text>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoTitleRow}>
            <AppIcon name="clock" size={14} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Horário de funcionamento</Text>
          </View>
          <Text style={styles.infoValue}>{scheduleLabel}</Text>
        </View>

        {point.amenities.length > 0 ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Estrutura disponível</Text>
            <View style={styles.amenities}>
              {point.amenities.map((amenity) => (
                <View key={amenity} style={styles.amenityChip}>
                  <AppIcon name="check" size={13} color={colors.primaryDark} />
                  <Text style={styles.amenityChipText}>
                    {amenityLabels[amenity]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.meta}>
          Cadastrado por {point.createdByName} em{' '}
          {formatDateTime(point.createdAt)}
          {point.updatedBy && point.updatedAt
            ? `\nÚltima atualização por ${point.updatedBy} em ${formatDateTime(point.updatedAt)}`
            : ''}
        </Text>

        <View style={styles.routeActions}>
          <CustomButton
            title="Traçar rota no mapa externo"
            icon="external-link"
            onPress={handleOpenDirections}
          />
        </View>
      </View>

      {point.photoUri ? (
        <Image source={{ uri: point.photoUri }} style={styles.photo} />
      ) : null}

      {activeReports.length > 0 ? (
        <View style={styles.reportsCard}>
          <View style={styles.reportsHeader}>
            <AppIcon name="alert-triangle" size={18} color={colors.warning} />
            <Text style={styles.reportsTitle}>
              {activeReports.length} relato(s) de problema em aberto
            </Text>
          </View>
          {activeReports.map((report) => (
            <View key={report.id} style={styles.reportItem}>
              <Text style={styles.reportDescription}>{report.description}</Text>
              <Text style={styles.reportMeta}>
                Por {report.createdByName} · {formatDateTime(report.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {canManageActivation ? (
        <View style={styles.ownerCard}>
          <View style={styles.ownerHeader}>
            <AppIcon
              name={isAdmin ? 'shield' : 'user'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>
              {isOwner
                ? 'Este ponto foi cadastrado por você'
                : 'Gestão Administrativa do Ponto'}
            </Text>
          </View>
          <Text style={styles.ownerHint}>
            Se o local estiver fechado para manutenção ou reforma, você pode
            desativá-lo temporariamente do mapa público.
          </Text>
          <View style={styles.ownerButtons}>
            <CustomButton
              title={
                point.active ? 'Desativar temporariamente' : 'Reativar ponto'
              }
              icon={point.active ? 'eye-off' : 'eye'}
              variant={point.active ? 'danger' : 'primary'}
              onPress={handleToggleActive}
            />
            {isAdmin ? (
              <CustomButton
                title="Editar informações do ponto"
                icon="edit-2"
                variant="outline"
                onPress={() =>
                  navigation.navigate('PointForm', { editPointId: point.id })
                }
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.reportCard}>
        <Text style={styles.sectionTitle}>Encontrou algum problema?</Text>
        <Text style={styles.ownerHint}>
          Avise outros trabalhadores e a coordenação caso falte água, haja
          defeito ou o local esteja fechado.
        </Text>
        <CustomButton
          title={
            reportOpen ? 'Cancelar relato' : 'Reportar problema neste ponto'
          }
          icon={reportOpen ? 'x' : 'alert-triangle'}
          variant={reportOpen ? 'outline' : 'secondary'}
          onPress={handleStartReport}
        />

        {reportOpen ? (
          <View style={styles.reportForm}>
            <FormField
              label="Descreva o problema *"
              placeholder="Ex.: Bebedouro sem água ou torneira quebrada"
              multiline
              value={reportText}
              onChangeText={setReportText}
              error={reportErrors.description}
              maxLength={280}
            />
            <CameraCapture
              label="Foto (opcional)"
              photoUri={reportPhoto}
              onChangePhoto={setReportPhoto}
            />
            <CustomButton
              title="Enviar relato"
              icon="check"
              onPress={handleSendReport}
              loading={submitting}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  type: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  badgeOpen: {
    backgroundColor: colors.successLight,
  },
  badgeOpenText: {
    color: colors.success,
  },
  badgeClosed: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeClosedText: {
    color: colors.textMuted,
  },
  badgePending: {
    backgroundColor: colors.warningLight,
  },
  badgePendingText: {
    color: colors.warning,
  },
  description: {
    fontSize: fontSize.body,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 22,
  },
  infoBlock: {
    gap: 4,
    paddingTop: spacing.xxs,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  amenityChipText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  routeActions: {
    marginTop: spacing.xxs,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  reportsCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportsTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.warning,
  },
  reportItem: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.warningBorder,
    gap: 2,
  },
  reportDescription: {
    fontSize: fontSize.small,
    color: colors.text,
  },
  reportMeta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  ownerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ownerButtons: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  ownerHint: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reportForm: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
});
