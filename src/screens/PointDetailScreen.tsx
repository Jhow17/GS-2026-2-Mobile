/**
 * Tela 2 · Detalhe público de um ponto de apoio.
 * Mostra nome, tipo, descrição, foto, coordenadas, horário + "aberto agora",
 * comodidades (sombra, água gelada, assentos), distância e aviso de relatos.
 * Botões: "Como chegar" (Platform.select + Linking.openURL) e, só para bebedouros,
 * "Reportar problema" (exige identificação pelo ProfileModal antes de abrir o formulário).
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Loading } from '../components/Loading';
import { ProfileModal } from '../components/ProfileModal';
import { DEFAULT_REGION } from '../config/appConfig';
import { useLocation } from '../hooks/useLocation';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import type { PublicPointLookup } from '../services/supportPointStorage';
import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { PointDetailNavigation, PointDetailRoute } from '../types/navigation';
import type { SupportPointStatus } from '../types/supportPoint';
import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import { formatCoordinates, pointTypeIcons, pointTypeLabels } from '../utils/formatters';
import { isOpenNow } from '../utils/time';

function getUnavailableText(status: Exclude<SupportPointStatus, 'aprovado'>): {
  title: string;
  message: string;
} {
  switch (status) {
    case 'em_analise':
      return {
        title: 'Ponto em análise',
        message: 'Este envio ainda está aguardando aprovação e não está visível no mapa público.',
      };
    case 'desativado':
      return {
        title: 'Espaço desativado',
        message: 'O responsável desativou temporariamente este ponto de apoio.',
      };
    case 'rejeitado':
      return {
        title: 'Envio não aprovado',
        message: 'Este cadastro foi rejeitado na avaliação e não está disponível.',
      };
  }
}

export function PointDetailScreen() {
  const navigation = useNavigation<PointDetailNavigation>();
  const route = useRoute<PointDetailRoute>();
  const { pointId } = route.params;

  const { coordinates } = useLocation();
  const { profile, saveProfile } = useProfile();
  const { points, openReportsByPoint, loadPublicPoint } = useSupportPoints();

  const [lookup, setLookup] = useState<PublicPointLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const loadDetail = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadPublicPoint(pointId);
      setLookup(result);
    } catch {
      setError('Não foi possível carregar os detalhes deste ponto.');
    } finally {
      setLoading(false);
    }
  }, [loadPublicPoint, pointId]);

  // Recarrega quando o id ou a lista pública do contexto mudam (ex.: desativação).
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadPublicPoint(pointId)
      .then((result) => {
        if (active) {
          setLookup(result);
        }
      })
      .catch(() => {
        if (active) {
          setError('Não foi possível carregar os detalhes deste ponto.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadPublicPoint, pointId, points]);

  const referenceCoords = useMemo(
    () =>
      coordinates ?? {
        latitude: DEFAULT_REGION.latitude,
        longitude: DEFAULT_REGION.longitude,
      },
    [coordinates],
  );

  const handleOpenDirections = useCallback(async (): Promise<void> => {
    if (!lookup || lookup.kind !== 'ok') {
      return;
    }
    const { latitude, longitude, name } = lookup.point;
    const encodedName = encodeURIComponent(name);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedName}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${encodedName})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Atenção', 'Não foi possível abrir o aplicativo de mapas neste aparelho.');
    }
  }, [lookup]);

  const handleReportProblem = useCallback((): void => {
    if (!profile) {
      setProfileModalVisible(true);
      return;
    }
    navigation.navigate('PointForm', { mode: 'bebedouro_avariado', pointId });
  }, [navigation, pointId, profile]);

  const handleSaveProfileAndReport = useCallback(
    async (input: { name: string; contact?: string }) => {
      const saved = await saveProfile(input);
      navigation.navigate('PointForm', { mode: 'bebedouro_avariado', pointId });
      return saved;
    },
    [navigation, pointId, saveProfile],
  );

  // Estado 1: Carregando.
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Carregando detalhes do ponto..." />
      </SafeAreaView>
    );
  }

  // Estado 2: Erro.
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message={error} onRetry={loadDetail} />
      </SafeAreaView>
    );
  }

  // Estado 3a: Ponto não encontrado.
  if (!lookup || lookup.kind === 'not_found') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title="Ponto não encontrado"
          message="Este ponto de apoio não existe ou foi removido."
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // Estado 3b: Ponto desativado, rejeitado ou ainda em análise.
  if (lookup.kind === 'unavailable') {
    const unavailable = getUnavailableText(lookup.status);
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title={unavailable.title}
          message={unavailable.message}
          actionLabel="Voltar"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const { point } = lookup;
  const openNow = isOpenNow(point, new Date());
  const distanceMeters = calculateDistanceMeters(referenceCoords, point);
  const reportCount = openReportsByPoint[point.id] ?? 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {point.photoUri ? (
          <Image source={{ uri: point.photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: pointTypeColors[point.type] }]}>
            <Text style={styles.photoPlaceholderIcon}>{pointTypeIcons[point.type]}</Text>
            <Text style={styles.photoPlaceholderText}>{pointTypeLabels[point.type]}</Text>
          </View>
        )}

        <View style={styles.headerCard}>
          <View style={styles.badgesRow}>
            <View style={[styles.typeBadge, { backgroundColor: pointTypeColors[point.type] }]}>
              <Text style={styles.typeBadgeText}>
                {pointTypeIcons[point.type]} {pointTypeLabels[point.type]}
              </Text>
            </View>
            <View style={[styles.statusBadge, openNow ? styles.openBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, openNow ? styles.openText : styles.closedText]}>
                {openNow ? 'Aberto agora' : 'Fechado agora'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{point.name}</Text>
          <Text style={styles.description}>{point.description}</Text>
        </View>

        {reportCount > 0 ? (
          <View style={styles.warningCard} accessibilityRole="alert">
            <Text style={styles.warningTitle}>
              ⚠️ {reportCount} relato(s) de problema em aberto
            </Text>
            <Text style={styles.warningSubtitle}>
              Outros trabalhadores avisaram que este ponto pode estar com defeito ou sem água.
            </Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <Text style={styles.infoRow}>
            🕒 Horário:{' '}
            <Text style={styles.infoBold}>
              {point.is24h ? 'Aberto 24 horas' : `${point.opensAt} às ${point.closesAt}`}
            </Text>
          </Text>
          <Text style={styles.infoRow}>
            📏 Distância aproximada:{' '}
            <Text style={styles.infoBold}>{formatDistance(distanceMeters)}</Text>
          </Text>
          <Text style={styles.infoRow}>
            📍 Coordenadas:{' '}
            <Text style={styles.infoBold}>
              {formatCoordinates(point.latitude, point.longitude)}
            </Text>
          </Text>
          <Text style={styles.infoRow}>
            👤 Cadastrado por: <Text style={styles.infoBold}>{point.ownerName}</Text>
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Comodidades do local</Text>
          <View style={styles.amenitiesRow}>
            <View style={[styles.amenityChip, point.hasShade && styles.amenityActive]}>
              <Text style={styles.amenityText}>
                {point.hasShade ? '✅ Sombra' : '❌ Sem sombra'}
              </Text>
            </View>
            <View style={[styles.amenityChip, point.hasColdWater && styles.amenityActive]}>
              <Text style={styles.amenityText}>
                {point.hasColdWater ? '✅ Água gelada' : '❌ Sem água gelada'}
              </Text>
            </View>
            <View style={[styles.amenityChip, point.hasSeating && styles.amenityActive]}>
              <Text style={styles.amenityText}>
                {point.hasSeating ? '✅ Assentos' : '❌ Sem assentos'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <CustomButton title="🧭 Como chegar" onPress={handleOpenDirections} />
          {point.type === 'bebedouro' ? (
            <CustomButton
              title="🔧 Reportar problema no bebedouro"
              variant="outline"
              onPress={handleReportProblem}
            />
          ) : null}
        </View>
      </ScrollView>

      <ProfileModal
        visible={profileModalVisible}
        initialProfile={profile}
        onClose={() => setProfileModalVisible(false)}
        onSave={handleSaveProfileAndReport}
      />
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
  photo: {
    width: '100%',
    height: 208,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoPlaceholderIcon: {
    fontSize: fontSize.display,
  },
  photoPlaceholderText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  typeBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  openBadge: {
    backgroundColor: colors.primaryLight,
  },
  closedBadge: {
    backgroundColor: colors.border,
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  openText: {
    color: colors.primaryDark,
  },
  closedText: {
    color: colors.textMuted,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.body,
    fontWeight: '400',
    color: colors.text,
  },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  warningTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.warning,
  },
  warningSubtitle: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  infoRow: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  infoBold: {
    fontWeight: '700',
    color: colors.text,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  amenityChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  amenityText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    gap: spacing.sm,
  },
});
