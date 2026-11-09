/**
 * Tela 4 · Mapa de pontos de apoio e camada do Weather Maps 1.0.
 * Usa MapView nativo (react-native-maps), Marker colorido por tipo, filtros
 * por tipo e por "abertos agora" (useMemo), UrlTile com opacity 0.5 e cartão
 * ao tocar em um marcador.
 */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '../components/CustomButton';
import { ErrorState } from '../components/ErrorState';
import { Loading } from '../components/Loading';
import { MapLayerToggle } from '../components/MapLayerToggle';
import { PermissionNotice } from '../components/PermissionNotice';
import { DEFAULT_REGION } from '../config/appConfig';
import { useLocation } from '../hooks/useLocation';
import { useSupportPoints } from '../hooks/useSupportPoints';
import * as weatherService from '../services/weatherService';
import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { MapNavigation } from '../types/navigation';
import type { SupportPoint, SupportPointType } from '../types/supportPoint';
import type { WeatherTileLayer } from '../types/weather';
import { calculateDistanceMeters, formatDistance } from '../utils/distance';
import { pointTypeIcons, pointTypeLabels } from '../utils/formatters';
import { isOpenNow } from '../utils/time';

type TypeFilter = SupportPointType | 'todos';

interface TypeFilterOption {
  value: TypeFilter;
  label: string;
}

const TYPE_FILTERS: readonly TypeFilterOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'bebedouro', label: '🚰 Bebedouros' },
  { value: 'descanso', label: '🪑 Descanso' },
  { value: 'sombra', label: '🌳 Sombra' },
  { value: 'outro', label: '📍 Outros' },
];

export function MapScreen() {
  const navigation = useNavigation<MapNavigation>();
  const { coordinates, permission, requestPermission, openSettings } = useLocation({
    watch: true,
  });
  const { points, openReportsByPoint, loading, error, reload } = useSupportPoints();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<WeatherTileLayer | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const centeredOnceRef = useRef(false);

  // Quando a localização chega pela primeira vez, move a câmera do mapa.
  useEffect(() => {
    if (coordinates && mapRef.current && !centeredOnceRef.current) {
      centeredOnceRef.current = true;
      const nextRegion: Region = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      };
      mapRef.current.animateToRegion(nextRegion, 500);
    }
  }, [coordinates]);

  /** Lista derivada sem mutar o estado original. */
  const filteredPoints = useMemo<SupportPoint[]>(() => {
    const now = new Date();
    return points.filter((point) => {
      if (typeFilter !== 'todos' && point.type !== typeFilter) {
        return false;
      }
      if (onlyOpenNow && !isOpenNow(point, now)) {
        return false;
      }
      return true;
    });
  }, [points, typeFilter, onlyOpenNow]);

  const selectedPoint = useMemo<SupportPoint | null>(
    () => filteredPoints.find((point) => point.id === selectedPointId) ?? null,
    [filteredPoints, selectedPointId],
  );

  const referenceCoords = useMemo(
    () =>
      coordinates ?? {
        latitude: DEFAULT_REGION.latitude,
        longitude: DEFAULT_REGION.longitude,
      },
    [coordinates],
  );

  const selectedDistance = useMemo<number | null>(
    () => (selectedPoint ? calculateDistanceMeters(referenceCoords, selectedPoint) : null),
    [selectedPoint, referenceCoords],
  );

  const tileUrlTemplate = useMemo<string>(
    () => (selectedLayer ? weatherService.getWeatherTileUrl(selectedLayer) : ''),
    [selectedLayer],
  );

  const tileNotice = useMemo<string | null>(() => {
    if (!selectedLayer) {
      return null;
    }
    if (tileUrlTemplate.length === 0) {
      return 'Camada indisponível no modo demonstração (configure a chave da OpenWeather no .env).';
    }
    return null;
  }, [selectedLayer, tileUrlTemplate]);

  const handleSelectMarker = useCallback((pointId: string): void => {
    setSelectedPointId(pointId);
  }, []);

  const handleOpenDetails = useCallback((): void => {
    if (selectedPoint) {
      navigation.navigate('PointDetail', { pointId: selectedPoint.id });
    }
  }, [navigation, selectedPoint]);

  const handleCloseCard = useCallback((): void => {
    setSelectedPointId(null);
  }, []);

  // Estado 1: Carregando.
  if (loading && points.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Carregando pontos de apoio no mapa..." />
      </SafeAreaView>
    );
  }

  // Estado 2: Erro.
  if (error && points.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  const initialRegion: Region = {
    latitude: coordinates?.latitude ?? DEFAULT_REGION.latitude,
    longitude: coordinates?.longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  };

  const selectedOpenNow = selectedPoint ? isOpenNow(selectedPoint, new Date()) : false;
  const selectedReports = selectedPoint ? (openReportsByPoint[selectedPoint.id] ?? 0) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={permission === 'granted'}
          showsMyLocationButton={permission === 'granted'}
        >
          {selectedLayer && tileUrlTemplate.length > 0 ? (
            <UrlTile
              key={selectedLayer}
              urlTemplate={tileUrlTemplate}
              opacity={0.5}
              zIndex={-1}
              flipY={false}
              maximumZ={19}
            />
          ) : null}

          {filteredPoints.map((point) => (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              title={point.name}
              description={pointTypeLabels[point.type]}
              pinColor={pointTypeColors[point.type]}
              zIndex={2}
              onPress={() => handleSelectMarker(point.id)}
            />
          ))}
        </MapView>

        <View style={styles.topOverlay} pointerEvents="box-none">
          {permission !== 'granted' ? (
            <PermissionNotice
              title="Localização desativada"
              description="Permita a localização para centralizar o mapa onde você está."
              permission={permission}
              onRequestPermission={requestPermission}
              onOpenSettings={openSettings}
            />
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {TYPE_FILTERS.map((filter) => {
              const active = typeFilter === filter.value;
              return (
                <Pressable
                  key={filter.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTypeFilter(filter.value)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: onlyOpenNow }}
              onPress={() => setOnlyOpenNow((current) => !current)}
              style={[styles.filterChip, onlyOpenNow && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, onlyOpenNow && styles.filterChipTextActive]}>
                🕒 Abertos agora
              </Text>
            </Pressable>
          </ScrollView>

          <MapLayerToggle
            selectedLayer={selectedLayer}
            onSelectLayer={setSelectedLayer}
            notice={tileNotice}
          />
        </View>

        {/* Estado 3: Vazio ("Nenhum ponto na região" / filtro sem resultado). */}
        {filteredPoints.length === 0 ? (
          <View style={styles.emptyBanner} accessibilityRole="alert">
            <Text style={styles.emptyTitle}>Nenhum ponto na região</Text>
            <Text style={styles.emptySubtitle}>
              Ajuste os filtros acima ou cadastre um novo espaço na aba Colaborar.
            </Text>
          </View>
        ) : null}

        {selectedPoint ? (
          <View style={styles.bottomCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {pointTypeIcons[selectedPoint.type]} {selectedPoint.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar cartão"
                onPress={handleCloseCard}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.cardMeta}>
              {pointTypeLabels[selectedPoint.type]}
              {selectedDistance !== null ? ` · ${formatDistance(selectedDistance)}` : ''}
              {' · '}
              {selectedOpenNow ? 'Aberto agora' : 'Fechado agora'}
            </Text>
            {selectedReports > 0 ? (
              <Text style={styles.reportWarning}>
                ⚠️ {selectedReports} relato(s) de problema aberto(s)
              </Text>
            ) : null}
            <CustomButton title="Ver detalhes" compact onPress={handleOpenDetails} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  filterRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  filterChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterChipText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  emptyBanner: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
    ...cardShadow,
  },
  emptyTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  bottomCard: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  closeText: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  cardMeta: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textMuted,
  },
  reportWarning: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.warning,
  },
});
