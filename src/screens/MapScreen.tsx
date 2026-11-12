/**
 * Tela do Mapa de Pontos de Apoio (corrigida com InteractiveMapView - Opção 1B):
 * - Mapa base visível no Expo Go (Android e iOS) sem área preta;
 * - Marcadores categorizados por cor para cada ponto aprovado e ativo;
 * - Sobreposição de camadas da OpenWeather (Calor, Chuva, Nuvens, Vento);
 * - Filtros por categoria sem emojis (M1);
 * - Gaveta inferior com pré-visualização do ponto selecionado e lista ordenada por distância.
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../components/AppIcon';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { InteractiveMapView } from '../components/InteractiveMapView';
import { Loading } from '../components/Loading';
import { MapLayerToggle } from '../components/MapLayerToggle';
import { PointListItem } from '../components/PointListItem';
import { DEFAULT_REGION, HAS_API_KEY } from '../config/appConfig';
import { useLocation } from '../hooks/useLocation';
import { useSupportPoints } from '../hooks/useSupportPoints';
import * as weatherService from '../services/weatherService';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { Coordinates } from '../types/location';
import type { RootStackParamList, RootTabParamList } from '../types/navigation';
import type { PointType, SupportPoint } from '../types/supportPoint';
import type { WeatherTileLayer } from '../types/weather';
import { calculateDistanceMeters } from '../utils/distance';
import { pointTypeIconNames, pointTypeLabels } from '../utils/formatters';

type MapTabProps = BottomTabScreenProps<RootTabParamList, 'Map'>;

type MapNavigation = CompositeNavigationProp<
  MapTabProps['navigation'],
  NativeStackNavigationProp<RootStackParamList>
>;

interface PointWithDistance {
  point: SupportPoint;
  distanceMeters: number | null;
  openReports: number;
}

const FILTER_TYPES: readonly (PointType | 'all')[] = [
  'all',
  'bebedouro',
  'sombra',
  'descanso',
  'parceiro',
];

export function MapScreen({ route }: MapTabProps) {
  const navigation = useNavigation<MapNavigation>();
  const { points, reports, loading, error, refresh } = useSupportPoints();
  const { coordinates, permission, requestPermission } = useLocation({
    watch: true,
  });

  const [selectedType, setSelectedType] = useState<PointType | 'all'>('all');
  const [selectedLayer, setSelectedLayer] = useState<WeatherTileLayer | null>(
    null,
  );
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Se recebeu focusPointId via parâmetro de rota, seleciona e centraliza nele
  useEffect(() => {
    const focusId = route.params?.focusPointId;
    if (!focusId) {
      return;
    }
    const target = points.find((item) => item.id === focusId);
    if (target) {
      setSelectedPointId(target.id);
      setMapCenter({ latitude: target.latitude, longitude: target.longitude });
      setMapZoom(16);
    }
  }, [route.params?.focusPointId, points]);

  // Centraliza na posição do usuário quando obtida pela primeira vez (se nenhum ponto estiver focado)
  useEffect(() => {
    if (coordinates && !route.params?.focusPointId && !selectedPointId) {
      setMapCenter(coordinates);
    }
  }, [coordinates, route.params?.focusPointId, selectedPointId]);

  const openReportCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const report of reports) {
      if (report.status === 'open') {
        counts[report.pointId] = (counts[report.pointId] ?? 0) + 1;
      }
    }
    return counts;
  }, [reports]);

  // Somente pontos aprovados e ativos aparecem no mapa público, ordenados por distância
  const visiblePoints = useMemo<PointWithDistance[]>(() => {
    const filtered = points.filter(
      (point) =>
        point.status === 'approved' &&
        point.active &&
        (selectedType === 'all' || point.type === selectedType),
    );
    const withDistance = filtered.map((point): PointWithDistance => ({
      point,
      distanceMeters: coordinates
        ? calculateDistanceMeters(coordinates, {
            latitude: point.latitude,
            longitude: point.longitude,
          })
        : null,
      openReports: openReportCounts[point.id] ?? 0,
    }));
    return [...withDistance].sort((a, b) => {
      if (a.distanceMeters !== null && b.distanceMeters !== null) {
        return a.distanceMeters - b.distanceMeters;
      }
      return a.point.name.localeCompare(b.point.name);
    });
  }, [points, selectedType, coordinates, openReportCounts]);

  const mapPoints = useMemo<SupportPoint[]>(
    () => visiblePoints.map((item) => item.point),
    [visiblePoints],
  );

  const selectedPoint = useMemo<SupportPoint | null>(
    () =>
      visiblePoints.find((item) => item.point.id === selectedPointId)?.point ??
      null,
    [visiblePoints, selectedPointId],
  );

  const tileUrlTemplate = useMemo<string>(
    () =>
      selectedLayer ? weatherService.getWeatherTileUrl(selectedLayer) : '',
    [selectedLayer],
  );

  const layerNotice =
    selectedLayer && !HAS_API_KEY
      ? 'Configure EXPO_PUBLIC_OPENWEATHER_API_KEY no .env para ver a camada da OpenWeather.'
      : null;

  const handleCenterOnUser = useCallback(async (): Promise<void> => {
    if (permission !== 'granted') {
      await requestPermission();
      return;
    }
    if (coordinates) {
      setMapCenter({ ...coordinates });
      setMapZoom(15);
    }
  }, [permission, requestPermission, coordinates]);

  const handleMarkerSelect = useCallback(
    (pointId: string): void => {
      setSelectedPointId(pointId);
      const found = points.find((p) => p.id === pointId);
      if (found) {
        setMapCenter({ latitude: found.latitude, longitude: found.longitude });
        setMapZoom(15);
      }
    },
    [points],
  );

  const handleOpenDetail = useCallback(
    (point: SupportPoint): void => {
      setSelectedPointId(point.id);
      navigation.navigate('PointDetail', { pointId: point.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PointWithDistance>) => (
      <PointListItem
        point={item.point}
        distanceMeters={item.distanceMeters}
        reportCount={item.openReports}
        selected={item.point.id === selectedPointId}
        onPress={handleOpenDetail}
      />
    ),
    [selectedPointId, handleOpenDetail],
  );

  const keyExtractor = useCallback(
    (item: PointWithDistance): string => item.point.id,
    [],
  );

  if (loading && points.length === 0) {
    return <Loading message="Carregando pontos de apoio..." />;
  }

  if (error && points.length === 0) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.mapArea}>
          <InteractiveMapView
            center={mapCenter}
            zoom={mapZoom}
            points={mapPoints}
            selectedPointId={selectedPointId}
            userLocation={permission === 'granted' ? coordinates : null}
            weatherTileUrlTemplate={tileUrlTemplate}
            onSelectPoint={handleMarkerSelect}
            style={styles.map}
          />

          <View style={styles.topOverlay}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {FILTER_TYPES.map((type) => {
                const active = selectedType === type;
                const label = type === 'all' ? 'Todos' : pointTypeLabels[type];
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedType(type)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    {type !== 'all' ? (
                      <AppIcon
                        name={pointTypeIconNames[type]}
                        size={14}
                        color={
                          active ? colors.textOnPrimary : colors.textSecondary
                        }
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <MapLayerToggle
              selectedLayer={selectedLayer}
              onSelectLayer={setSelectedLayer}
              notice={layerNotice}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Centralizar na minha localização"
            onPress={handleCenterOnUser}
            style={styles.centerButton}
          >
            <AppIcon name="navigation" size={16} color={colors.primary} />
            <Text style={styles.centerButtonText}>Minha posição</Text>
          </Pressable>
        </View>

        <View style={styles.drawer}>
          {selectedPoint ? (
            <View style={styles.previewBar}>
              <View style={styles.previewInfo}>
                <Text style={styles.previewLabel}>Ponto selecionado</Text>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {selectedPoint.name}
                </Text>
              </View>
              <CustomButton
                title="Ver detalhes"
                compact
                onPress={() => handleOpenDetail(selectedPoint)}
              />
            </View>
          ) : null}

          <Text style={styles.drawerTitle}>
            Pontos no mapa ({visiblePoints.length})
          </Text>
          <FlatList
            data={visiblePoints}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyState
                icon="map-pin"
                title="Nenhum ponto nesta categoria"
                message="Troque o filtro acima ou sugira um novo ponto na aba Colaborar."
              />
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  mapArea: {
    flex: 1.15,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.sm,
    right: spacing.sm,
    gap: spacing.xs,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...cardShadow,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  centerButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    ...cardShadow,
  },
  centerButtonText: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.primary,
  },
  drawer: {
    flex: 0.85,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...cardShadow,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  previewTitle: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  drawerTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
});
