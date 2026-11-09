/**
 * Tela 1 · Início.
 * Mostra o alerta combinado, o índice de calor, a qualidade do ar, o resumo do clima,
 * a previsão (próximas 8 faixas + faixa mais amena + tendência), o ponto de apoio mais
 * próximo e o ranking de pontos mais quentes da cidade.
 * Usa uma única FlatList com ListHeaderComponent (sem ScrollView envolvendo lista).
 */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertCard } from '../components/AlertCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ForecastStrip } from '../components/ForecastStrip';
import { HotSpotItem } from '../components/HotSpotItem';
import { Loading } from '../components/Loading';
import { PermissionNotice } from '../components/PermissionNotice';
import { PointListItem } from '../components/PointListItem';
import { WeatherSummary } from '../components/WeatherSummary';
import { DEFAULT_REGION, NEARBY_RADIUS_METERS } from '../config/appConfig';
import { useLocation } from '../hooks/useLocation';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { useWeather } from '../hooks/useWeather';
import { findMildestSlot, getAlertMessage } from '../services/heatIndexService';
import { alertColors, alertTextColors, colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { HomeNavigation } from '../types/navigation';
import type { SupportPoint } from '../types/supportPoint';
import type { HotSpot } from '../types/weather';
import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import {
  airQualityLabels,
  alertLevelLabels,
  formatHeatIndex,
  formatTime,
  heatTrendIcons,
  heatTrendLabels,
} from '../utils/formatters';

interface NearestPoint {
  point: SupportPoint;
  distanceMeters: number;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { profile, workerMode, setWorkerMode } = useProfile();
  const {
    coordinates,
    permission,
    requestPermission,
    refresh: refreshLocation,
    openSettings,
  } = useLocation();
  const { bundle, hotSpots, hotSpotsError, loading, refreshing, error, reload } = useWeather(
    coordinates,
    workerMode,
  );
  const { points, openReportsByPoint, reload: reloadPoints } = useSupportPoints();

  const referenceCoords = useMemo(
    () =>
      coordinates ?? {
        latitude: DEFAULT_REGION.latitude,
        longitude: DEFAULT_REGION.longitude,
      },
    [coordinates],
  );

  /** Próximas 8 faixas (24 horas) da previsão. */
  const nextEightSlots = useMemo(
    () => (bundle ? bundle.forecast.slice(0, 8) : []),
    [bundle],
  );

  /** Faixa de menor índice de calor nas próximas 24 horas. */
  const mildestSlot = useMemo(
    () => (bundle ? findMildestSlot(bundle.forecast, 24) : null),
    [bundle],
  );

  /** Ponto público mais próximo da posição de referência. */
  const nearestPoint = useMemo<NearestPoint | null>(() => {
    return points.reduce<NearestPoint | null>((closest, point) => {
      const distanceMeters = calculateDistanceMeters(referenceCoords, point);
      if (closest === null || distanceMeters < closest.distanceMeters) {
        return { point, distanceMeters };
      }
      return closest;
    }, null);
  }, [points, referenceCoords]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    await Promise.all([refreshLocation(), reload(), reloadPoints()]);
  }, [refreshLocation, reload, reloadPoints]);

  const handleOpenPoint = useCallback(
    (point: SupportPoint): void => {
      navigation.navigate('PointDetail', { pointId: point.id });
    },
    [navigation],
  );

  const handleToggleWorkerMode = useCallback(
    (value: boolean): void => {
      setWorkerMode(value);
    },
    [setWorkerMode],
  );

  const renderHotSpot = useCallback(
    ({ item, index }: ListRenderItemInfo<HotSpot>) => (
      <HotSpotItem spot={item} position={index + 1} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: HotSpot) => item.id, []);

  // Estado 1: Carregando inicial.
  if (loading && !bundle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Calculando o índice de calor da sua região..." />
      </SafeAreaView>
    );
  }

  // Estado 2: Erro sem dados disponíveis.
  if (error && !bundle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message={error} onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  // Estado 3: Vazio (sem leitura disponível).
  if (!bundle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title="Sem leitura de clima"
          message="Não encontramos dados para esta região."
          actionLabel="Atualizar"
          onAction={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  const greeting = profile ? `Olá, ${profile.name}` : 'Olá, trabalhador(a)';
  const updatedTime = formatTime(bundle.current.readAt);
  const updatedLabel =
    bundle.current.source === 'mock'
      ? `Modo demonstração · leitura às ${updatedTime}`
      : `Leitura às ${updatedTime}`;
  const airLevelColor = alertColors[bundle.alert.airLevel];
  const airLevelTextColor = alertTextColors[bundle.alert.airLevel];

  const headerElement = (
    <View style={styles.headerContent}>
      <View style={styles.greetingBox}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.locationText}>
          📍 {bundle.current.name} · {updatedTime}
        </Text>
      </View>

      {permission !== 'granted' ? (
        <PermissionNotice
          title="Usando a região padrão"
          description="Permita o acesso à localização para ver o índice de calor e os pontos de apoio perto de você."
          permission={permission}
          onRequestPermission={requestPermission}
          onOpenSettings={openSettings}
        />
      ) : null}

      {bundle.isStale ? (
        <View style={styles.staleBanner} accessibilityRole="alert">
          <Text style={styles.staleText}>
            ⚠️ Sem conexão: mostrando dados salvos de {updatedTime}.
          </Text>
        </View>
      ) : null}

      <AlertCard
        level={bundle.alert.combinedLevel}
        heatIndexC={bundle.alert.heatIndexC}
        message={getAlertMessage(bundle.alert.combinedLevel)}
        updatedLabel={updatedLabel}
      />

      <View style={styles.workerRow}>
        <View style={styles.workerTextBox}>
          <Text style={styles.workerTitle}>Perfil trabalhador na rua</Text>
          <Text style={styles.workerSubtitle}>
            Antecipa os alertas em 2 °C para quem trabalha exposto ao sol
          </Text>
        </View>
        <Switch
          value={workerMode}
          onValueChange={handleToggleWorkerMode}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={workerMode ? colors.primary : colors.disabled}
        />
      </View>

      <View style={styles.airCard}>
        <View style={styles.airInfo}>
          <Text style={styles.sectionSmallTitle}>Qualidade do ar</Text>
          <Text style={styles.airSubtitle}>
            Índice {bundle.airQuality.index}/5 ({airQualityLabels[bundle.airQuality.index]}) · PM2.5{' '}
            {bundle.airQuality.pm25.toFixed(1).replace('.', ',')} µg/m³
          </Text>
        </View>
        <View style={[styles.airBadge, { backgroundColor: airLevelColor }]}>
          <Text style={[styles.airBadgeText, { color: airLevelTextColor }]}>
            {alertLevelLabels[bundle.alert.airLevel]}
          </Text>
        </View>
      </View>

      <WeatherSummary reading={bundle.current} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximas 24 horas</Text>
          <Text style={styles.trendBadge}>
            {heatTrendIcons[bundle.trend]} {heatTrendLabels[bundle.trend]}
          </Text>
        </View>
        <ForecastStrip slots={nextEightSlots} />
        {mildestSlot ? (
          <Text style={styles.mildestText}>
            🌤️ Horário mais ameno: {formatTime(mildestSlot.at)} (índice{' '}
            {formatHeatIndex(mildestSlot.heatIndexC)})
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ponto de apoio mais próximo</Text>
        {nearestPoint ? (
          <>
            <PointListItem
              point={nearestPoint.point}
              distanceMeters={nearestPoint.distanceMeters}
              reportCount={openReportsByPoint[nearestPoint.point.id] ?? 0}
              onPress={handleOpenPoint}
            />
            {nearestPoint.distanceMeters > NEARBY_RADIUS_METERS ? (
              <Text style={styles.farHint}>
                Nenhum ponto em um raio de {formatDistance(NEARBY_RADIUS_METERS)}. Mostrando o mais
                próximo disponível.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.farHint}>Nenhum ponto de apoio público cadastrado ainda.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Pontos mais quentes da cidade</Text>
      {hotSpotsError ? <Text style={styles.farHint}>{hotSpotsError}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={hotSpots}
        keyExtractor={keyExtractor}
        renderItem={renderHotSpot}
        ListHeaderComponent={headerElement}
        ListEmptyComponent={
          <EmptyState
            title="Sem ranking no momento"
            message="Puxe para atualizar os pontos monitorados da cidade."
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  greetingBox: {
    gap: spacing.xxs,
  },
  greeting: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  locationText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textMuted,
  },
  staleBanner: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  staleText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.warning,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    ...cardShadow,
  },
  workerTextBox: {
    flex: 1,
  },
  workerTitle: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  workerSubtitle: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textMuted,
  },
  airCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  airInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  sectionSmallTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  airSubtitle: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  airBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  airBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  trendBadge: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  mildestText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  farHint: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
