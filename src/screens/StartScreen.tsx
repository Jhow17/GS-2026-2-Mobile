/**
 * Tela Inicial (Aba "Início" - M4):
 * Combina o alerta de calor da região no topo (com explicação M2 e dicas de proteção M3)
 * e a lista de pontos de apoio aprovados e ativos ordenados por distância logo abaixo.
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
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertCard } from '../components/AlertCard';
import { AppIcon } from '../components/AppIcon';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { PermissionNotice } from '../components/PermissionNotice';
import { PointListItem } from '../components/PointListItem';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { useWeather } from '../hooks/useWeather';
import { getAlertMessage } from '../services/heatIndexService';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList, RootTabParamList } from '../types/navigation';
import type { PointType, SupportPoint } from '../types/supportPoint';
import { calculateDistanceMeters } from '../utils/distance';
import {
  formatDateTime,
  pointTypeIconNames,
  pointTypeLabels,
} from '../utils/formatters';

type StartNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Start'>,
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

export function StartScreen() {
  const navigation = useNavigation<StartNavigation>();
  const { session, isAdmin, logout } = useAuth();
  const [workerMode, setWorkerMode] = useState(true);
  const [selectedType, setSelectedType] = useState<PointType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    coordinates,
    permission,
    requestPermission,
    openSettings,
  } = useLocation({ watch: false });

  const {
    bundle,
    refreshing: weatherRefreshing,
    reload: reloadWeather,
  } = useWeather(coordinates, workerMode);

  const {
    points,
    reports,
    refresh: refreshPoints,
  } = useSupportPoints();

  const handleRefresh = useCallback(async (): Promise<void> => {
    await Promise.all([reloadWeather(), refreshPoints()]);
  }, [reloadWeather, refreshPoints]);

  // Mapa de relatos abertos por ponto
  const openReportCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const report of reports) {
      if (report.status === 'open') {
        counts[report.pointId] = (counts[report.pointId] ?? 0) + 1;
      }
    }
    return counts;
  }, [reports]);

  // Todos os pontos aprovados e ativos ordenados por distância (para o atalho M3)
  const allApprovedSorted = useMemo<PointWithDistance[]>(() => {
    const approved = points.filter((p) => p.status === 'approved' && p.active);
    const withDistance = approved.map((point): PointWithDistance => ({
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
  }, [points, coordinates, openReportCounts]);

  // Pontos filtrados pela categoria e busca textual
  const filteredPoints = useMemo<PointWithDistance[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return allApprovedSorted.filter(({ point }) => {
      const matchesType =
        selectedType === 'all' || point.type === selectedType;
      if (!matchesType) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        point.name.toLowerCase().includes(normalizedQuery) ||
        point.address.toLowerCase().includes(normalizedQuery) ||
        point.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [allApprovedSorted, selectedType, searchQuery]);

  const nearestPoint = allApprovedSorted[0] ?? null;

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

  const handleOpenPointDetail = useCallback(
    (point: SupportPoint): void => {
      navigation.navigate('PointDetail', { pointId: point.id });
    },
    [navigation],
  );

  const handleOpenNearestById = useCallback(
    (pointId: string): void => {
      navigation.navigate('PointDetail', { pointId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PointWithDistance>) => (
      <PointListItem
        point={item.point}
        distanceMeters={item.distanceMeters}
        reportCount={item.openReports}
        onPress={handleOpenPointDetail}
      />
    ),
    [handleOpenPointDetail],
  );

  const keyExtractor = useCallback(
    (item: PointWithDistance): string => item.point.id,
    [],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      {/* Barra superior com identificação do usuário ou botão Entrar */}
      <View style={styles.topBar}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>CitizenTech</Text>
          <Text style={styles.brandSubtitle}>
            Apoio térmico urbano · {bundle?.current.name ?? 'São Paulo'}
          </Text>
        </View>
        {session ? (
          <View style={styles.userActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Meus pontos cadastrados"
              onPress={() => navigation.navigate('MyPlaces')}
              style={styles.userPill}
            >
              <AppIcon
                name={isAdmin ? 'shield' : 'user'}
                size={15}
                color={colors.primary}
              />
              <Text style={styles.userPillText} numberOfLines={1}>
                {session.name.split(' ')[0]}
              </Text>
            </Pressable>
            {isAdmin ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
                onPress={logout}
                style={styles.logoutIconBtn}
              >
                <AppIcon name="log-out" size={18} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entrar na sua conta"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginPill}
          >
            <AppIcon name="log-in" size={15} color={colors.primary} />
            <Text style={styles.loginPillText}>Entrar</Text>
          </Pressable>
        )}
      </View>

      {permission !== 'granted' ? (
        <PermissionNotice
          title="Localização desativada"
          description="Ative o GPS para ordenar os pontos de hidratação e descanso mais próximos de você."
          permission={permission}
          onRequestPermission={requestPermission}
          onOpenSettings={openSettings}
        />
      ) : null}

      {/* Alerta de calor no topo (M2 + M3 + M4) */}
      {bundle ? (
        <AlertCard
          level={bundle.alert.combinedLevel}
          heatIndexC={bundle.alert.heatIndexC}
          message={getAlertMessage(bundle.alert.combinedLevel)}
          updatedLabel={updatedLabel}
          nearestPoint={nearestPoint}
          onOpenNearestPoint={handleOpenNearestById}
        />
      ) : null}

      {/* Controles rápidos: modo trabalhador na rua e atalho para Clima completo */}
      <View style={styles.quickControlsRow}>
        <View style={styles.workerToggleCard}>
          <View style={styles.workerToggleInfo}>
            <Text style={styles.workerToggleTitle}>Trabalho na rua</Text>
            <Text style={styles.workerToggleSub}>
              Alertas 2 °C mais cedo para esforço ao sol
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
      </View>

      <View style={styles.shortcutsRow}>
        <CustomButton
          title="Previsão e clima"
          icon="thermometer"
          variant="outline"
          compact
          onPress={() => navigation.navigate('Weather')}
          style={styles.shortcutBtn}
        />
        <CustomButton
          title="Abrir mapa"
          icon="map"
          variant="outline"
          compact
          onPress={() => navigation.navigate('Map')}
          style={styles.shortcutBtn}
        />
      </View>

      {/* Cabeçalho da seção de Pontos de Apoio */}
      <View style={styles.pointsSectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Pontos de apoio próximos</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredPoints.length} local(is) disponível(is) para hidratação e pausa
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cadastrar novo ponto de apoio"
          onPress={() => {
            if (session) {
              navigation.navigate('PointForm');
            } else {
              navigation.navigate('Login', {
                redirectTo: { target: 'PointForm' },
                reasonMessage:
                  'Entre na sua conta para sugerir um novo ponto de apoio.',
              });
            }
          }}
          style={styles.newPointLink}
        >
          <AppIcon name="plus-circle" size={16} color={colors.primary} />
          <Text style={styles.newPointLinkText}>Sugerir ponto</Text>
        </Pressable>
      </View>

      {/* Busca textual */}
      <View style={styles.searchBox}>
        <AppIcon name="search" size={18} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Buscar ponto de apoio por nome ou endereço"
          placeholder="Buscar por nome, rua ou bairro..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
          >
            <AppIcon name="x" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Chips de filtro por categoria (zero emojis) */}
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
                  size={15}
                  color={active ? colors.textOnPrimary : colors.textSecondary}
                />
              ) : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredPoints}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon="map-pin"
            title="Nenhum ponto encontrado"
            message="Tente limpar a busca ou escolher outra categoria de ponto de apoio."
            actionLabel="Mostrar todos"
            onAction={() => {
              setSelectedType('all');
              setSearchQuery('');
            }}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={weatherRefreshing}
            onRefresh={handleRefresh}
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
  headerBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brandBlock: {
    flex: 1,
  },
  brandTitle: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userPill: {
    minHeight: 44,
    maxWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  userPillText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  logoutIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  loginPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loginPillText: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.primary,
  },
  quickControlsRow: {
    gap: spacing.xs,
  },
  workerToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...cardShadow,
  },
  workerToggleInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  workerToggleTitle: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  workerToggleSub: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shortcutBtn: {
    flex: 1,
  },
  pointsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  newPointLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  newPointLinkText: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.primary,
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearSearchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: 2,
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
});
