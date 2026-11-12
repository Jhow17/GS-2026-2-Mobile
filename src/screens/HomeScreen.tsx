/**
 * Tela de Clima Detalhado (Aba "Clima" - antiga HomeScreen, movida na M4):
 * Mostra alerta com explicação M2 e dicas M3, modo "Trabalho na rua",
 * resumo meteorológico, previsão das próximas 24h, qualidade do ar (PM2.5)
 * e ranking dos 10 pontos mais quentes de São Paulo.
 */
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
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
import { WeatherSummary } from '../components/WeatherSummary';
import { useLocation } from '../hooks/useLocation';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { useWeather } from '../hooks/useWeather';
import { getAlertMessage } from '../services/heatIndexService';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList, RootTabParamList } from '../types/navigation';
import type { HotSpot } from '../types/weather';
import { calculateDistanceMeters } from '../utils/distance';
import { airQualityLabels, formatDateTime } from '../utils/formatters';

type WeatherNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Weather'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<WeatherNavigation>();
  const [workerMode, setWorkerMode] = useState(true);
  const {
    coordinates,
    permission,
    requestPermission,
    openSettings,
  } = useLocation({ watch: false });

  const {
    bundle,
    hotSpots,
    hotSpotsError,
    loading,
    refreshing,
    error,
    reload,
  } = useWeather(coordinates, workerMode);

  const { points } = useSupportPoints();

  const nearestPoint = useMemo(() => {
    const approved = points.filter((p) => p.status === 'approved' && p.active);
    if (approved.length === 0) {
      return null;
    }
    const withDist = approved.map((point) => ({
      point,
      distanceMeters: coordinates
        ? calculateDistanceMeters(coordinates, {
            latitude: point.latitude,
            longitude: point.longitude,
          })
        : null,
    }));
    withDist.sort((a, b) => {
      if (a.distanceMeters !== null && b.distanceMeters !== null) {
        return a.distanceMeters - b.distanceMeters;
      }
      return a.point.name.localeCompare(b.point.name);
    });
    return withDist[0] ?? null;
  }, [points, coordinates]);

  const updatedLabel = useMemo<string>(() => {
    if (!bundle) {
      return '';
    }
    const base = `Atualizado em ${formatDateTime(bundle.fetchedAt)}`;
    if (bundle.current.source === 'mock') {
      return `${base} · modo demonstração`;
    }
    if (bundle.isStale) {
      return `${base} · sem conexão (dados salvos)`;
    }
    return base;
  }, [bundle]);

  const handleOpenNearestPoint = useCallback(
    (pointId: string): void => {
      navigation.navigate('PointDetail', { pointId });
    },
    [navigation],
  );

  const renderHotSpot = useCallback(
    ({ item, index }: ListRenderItemInfo<HotSpot>) => (
      <HotSpotItem spot={item} position={index + 1} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: HotSpot): string => item.id, []);

  if (loading && !bundle) {
    return <Loading message="Consultando clima da sua região..." />;
  }

  if (error && !bundle) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!bundle) {
    return (
      <EmptyState
        title="Sem dados de clima"
        message="Toque abaixo para tentar carregar novamente."
        actionLabel="Recarregar"
        onAction={reload}
      />
    );
  }

  const header = (
    <View style={styles.headerContent}>
      <Text style={styles.screenTitle}>Clima e Qualidade do Ar</Text>
      <Text style={styles.region}>{bundle.current.name}</Text>

      {permission !== 'granted' ? (
        <PermissionNotice
          title="Usando o centro de São Paulo"
          description="Permita o acesso à localização para ver o alerta exato de onde você está."
          permission={permission}
          onRequestPermission={requestPermission}
          onOpenSettings={openSettings}
        />
      ) : null}

      <AlertCard
        level={bundle.alert.combinedLevel}
        heatIndexC={bundle.alert.heatIndexC}
        message={getAlertMessage(bundle.alert.combinedLevel)}
        updatedLabel={updatedLabel}
        nearestPoint={nearestPoint}
        onOpenNearestPoint={handleOpenNearestPoint}
      />

      <View style={styles.workerRow}>
        <View style={styles.workerText}>
          <Text style={styles.workerTitle}>Trabalho na rua</Text>
          <Text style={styles.workerSubtitle}>
            Antecipa os alertas em 2 °C para quem pedala, pilota ou caminha sob o sol
          </Text>
        </View>
        <Switch
          accessibilityLabel="Alternar modo trabalho na rua"
          value={workerMode}
          onValueChange={setWorkerMode}
          trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
          thumbColor={workerMode ? colors.primary : colors.surface}
        />
      </View>

      <WeatherSummary reading={bundle.current} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximas 24 horas (de 3 em 3h)</Text>
        <ForecastStrip slots={bundle.forecast} />
      </View>

      {bundle.airQuality ? (
        <View style={styles.airCard}>
          <Text style={styles.sectionTitle}>Qualidade do ar</Text>
          <Text style={styles.airText}>
            {airQualityLabels[bundle.airQuality.index]} · PM2.5:{' '}
            {bundle.airQuality.pm25.toFixed(1)} µg/m³
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Pontos mais quentes de São Paulo</Text>
      {hotSpotsError ? (
        <Text style={styles.hotSpotsWarning}>{hotSpotsError}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={hotSpots}
        keyExtractor={keyExtractor}
        renderItem={renderHotSpot}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            title="Ranking indisponível"
            message="Puxe a tela para baixo para tentar carregar os pontos monitorados."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reload}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
  screenTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  region: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: -spacing.xs,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  workerText: {
    flex: 1,
  },
  workerTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  workerSubtitle: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  airCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xxs,
    ...cardShadow,
  },
  airText: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.text,
  },
  hotSpotsWarning: {
    fontSize: fontSize.small,
    color: colors.warning,
  },
});
