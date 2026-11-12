/**
 * Painel de Administração (M7 - substitui o antigo "Modo avaliador"):
 * Visível somente para usuários com role === 'admin'.
 * Organizado em 3 abas internas:
 * 1) Pedidos pendentes/rejeitados: Aprovar, Rejeitar (com motivo), Editar e Excluir;
 * 2) Pontos cadastrados (aprovados): Filtrar (Todos/Ativos/Inativos), Editar dados/CEP,
 *    Desativar/Reativar e Excluir definitivamente com confirmação;
 * 3) Relatos de defeito: Filtrar (Em aberto/Resolvidos), Marcar como resolvido e Excluir.
 */
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../components/AppIcon';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList, RootTabParamList } from '../types/navigation';
import type { DefectReport } from '../types/report';
import type { SupportPoint } from '../types/supportPoint';
import {
  amenityLabels,
  formatDateTime,
  pointStatusLabels,
  pointTypeIconNames,
  pointTypeLabels,
} from '../utils/formatters';

type AdminNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Admin'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type AdminTab = 'requests' | 'points' | 'reports';
type RequestFilter = 'pending' | 'rejected' | 'all';
type ApprovedFilter = 'all' | 'active' | 'inactive';
type ReportFilter = 'open' | 'resolved' | 'all';

export function AdminScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const { session, isAdmin, logout } = useAuth();
  const {
    points,
    reports,
    approvePoint,
    rejectPoint,
    toggleActive,
    deletePoint,
    resolveReport,
    deleteReport,
  } = useSupportPoints();

  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('pending');
  const [approvedFilter, setApprovedFilter] = useState<ApprovedFilter>('all');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('open');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de motivo de rejeição
  const [rejectTarget, setRejectTarget] = useState<SupportPoint | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pendingCount = useMemo(
    () => points.filter((p) => p.status === 'pending').length,
    [points],
  );
  const approvedCount = useMemo(
    () => points.filter((p) => p.status === 'approved').length,
    [points],
  );
  const openReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'open').length,
    [reports],
  );

  // Lista filtrada da Aba 1: Pedidos (pending / rejected)
  const filteredRequests = useMemo<SupportPoint[]>(() => {
    return points.filter((p) => {
      if (requestFilter === 'pending') {
        return p.status === 'pending';
      }
      if (requestFilter === 'rejected') {
        return p.status === 'rejected';
      }
      return p.status === 'pending' || p.status === 'rejected';
    });
  }, [points, requestFilter]);

  // Lista filtrada da Aba 2: Pontos aprovados
  const filteredApprovedPoints = useMemo<SupportPoint[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    return points.filter((p) => {
      if (p.status !== 'approved') {
        return false;
      }
      if (approvedFilter === 'active' && !p.active) {
        return false;
      }
      if (approvedFilter === 'inactive' && p.active) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
      );
    });
  }, [points, approvedFilter, searchQuery]);

  // Lista filtrada da Aba 3: Relatos de defeito
  const filteredReports = useMemo<DefectReport[]>(() => {
    return reports.filter((r) => {
      if (reportFilter === 'open') {
        return r.status === 'open';
      }
      if (reportFilter === 'resolved') {
        return r.status === 'resolved';
      }
      return true;
    });
  }, [reports, reportFilter]);

  const handleApprove = useCallback(
    async (point: SupportPoint): Promise<void> => {
      try {
        await approvePoint(point.id, session?.name);
        Alert.alert(
          'Ponto aprovado',
          `"${point.name}" foi aprovado e já aparece no Início e no Mapa.`,
        );
      } catch {
        Alert.alert('Atenção', 'Não foi possível aprovar este ponto agora.');
      }
    },
    [approvePoint, session?.name],
  );

  const handleConfirmReject = useCallback(async (): Promise<void> => {
    if (!rejectTarget) {
      return;
    }
    try {
      await rejectPoint(
        rejectTarget.id,
        session?.name,
        rejectionReason.trim() || 'Não atende aos critérios de ponto de apoio.',
      );
      setRejectTarget(null);
      setRejectionReason('');
    } catch {
      Alert.alert('Atenção', 'Não foi possível rejeitar o pedido agora.');
    }
  }, [rejectTarget, rejectPoint, session?.name, rejectionReason]);

  const handleDeletePoint = useCallback(
    (point: SupportPoint): void => {
      Alert.alert(
        'Excluir ponto definitivamente',
        `Tem certeza que deseja excluir "${point.name}"? Os relatos vinculados a este local também serão removidos.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePoint(point.id);
              } catch {
                Alert.alert('Atenção', 'Não foi possível excluir o ponto.');
              }
            },
          },
        ],
      );
    },
    [deletePoint],
  );

  const handleToggleActive = useCallback(
    async (point: SupportPoint): Promise<void> => {
      try {
        await toggleActive(point.id, !point.active, session?.name);
      } catch {
        Alert.alert('Atenção', 'Não foi possível alterar o status do ponto.');
      }
    },
    [toggleActive, session?.name],
  );

  const handleResolveReport = useCallback(
    async (report: DefectReport): Promise<void> => {
      try {
        await resolveReport(report.id, session?.name);
      } catch {
        Alert.alert('Atenção', 'Não foi possível marcar como resolvido.');
      }
    },
    [resolveReport, session?.name],
  );

  const handleDeleteReport = useCallback(
    (report: DefectReport): void => {
      Alert.alert(
        'Excluir relato',
        `Deseja remover definitivamente este relato sobre "${report.pointName}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteReport(report.id);
              } catch {
                Alert.alert('Atenção', 'Não foi possível excluir o relato.');
              }
            },
          },
        ],
      );
    },
    [deleteReport],
  );

  const renderRequestItem = useCallback(
    ({ item }: ListRenderItemInfo<SupportPoint>) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: pointTypeColors[item.type] },
            ]}
          >
            <AppIcon
              name={pointTypeIconNames[item.type]}
              size={20}
              color={colors.textOnPrimary}
            />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardCategory}>
              {pointTypeLabels[item.type]} · {pointStatusLabels[item.status]}
            </Text>
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.detailBox}>
          <Text style={styles.detailLine}>Endereço: {item.address}</Text>
          <Text style={styles.detailLine}>
            Coordenadas: {item.latitude.toFixed(5)},{' '}
            {item.longitude.toFixed(5)}
          </Text>
          <Text style={styles.detailLine}>
            Horário:{' '}
            {item.is24h
              ? '24 horas'
              : `Das ${item.opensAt} às ${item.closesAt}`}
          </Text>
          {item.amenities.length > 0 ? (
            <Text style={styles.detailLine}>
              Estrutura:{' '}
              {item.amenities.map((a) => amenityLabels[a]).join(', ')}
            </Text>
          ) : null}
          <Text style={styles.detailMeta}>
            Solicitado por {item.createdByName}
            {item.createdByContact ? ` (${item.createdByContact})` : ''} em{' '}
            {formatDateTime(item.createdAt)}
          </Text>
          {item.reviewedBy && item.reviewedAt ? (
            <Text style={styles.detailMeta}>
              Avaliado por {item.reviewedBy} em{' '}
              {formatDateTime(item.reviewedAt)}
            </Text>
          ) : null}
          {item.rejectionReason ? (
            <Text style={styles.rejectionNote}>
              Motivo da rejeição: {item.rejectionReason}
            </Text>
          ) : null}
        </View>

        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
        ) : null}

        <View style={styles.actionsRow}>
          <CustomButton
            title="Aprovar"
            icon="check"
            compact
            onPress={() => handleApprove(item)}
            style={styles.flexBtn}
          />
          {item.status === 'pending' ? (
            <CustomButton
              title="Rejeitar"
              icon="x"
              variant="secondary"
              compact
              onPress={() => {
                setRejectTarget(item);
                setRejectionReason('');
              }}
              style={styles.flexBtn}
            />
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <CustomButton
            title="Editar"
            icon="edit-2"
            variant="outline"
            compact
            onPress={() =>
              navigation.navigate('PointForm', { editPointId: item.id })
            }
            style={styles.flexBtn}
          />
          <CustomButton
            title="Excluir"
            icon="trash-2"
            variant="danger"
            compact
            onPress={() => handleDeletePoint(item)}
            style={styles.flexBtn}
          />
        </View>
      </View>
    ),
    [handleApprove, handleDeletePoint, navigation],
  );

  const renderApprovedPointItem = useCallback(
    ({ item }: ListRenderItemInfo<SupportPoint>) => (
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('PointDetail', { pointId: item.id })
          }
          style={styles.cardHeader}
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: pointTypeColors[item.type] },
            ]}
          >
            <AppIcon
              name={pointTypeIconNames[item.type]}
              size={20}
              color={colors.textOnPrimary}
            />
          </View>
          <View style={styles.cardTitleBlock}>
            <View style={styles.badgeInlineRow}>
              <Text style={styles.cardCategory}>
                {pointTypeLabels[item.type]}
              </Text>
              <View
                style={[
                  styles.statePill,
                  item.active ? styles.stateActive : styles.stateInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statePillText,
                    item.active
                      ? styles.stateActiveText
                      : styles.stateInactiveText,
                  ]}
                >
                  {item.active ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.detailMeta} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        </Pressable>

        {item.updatedBy && item.updatedAt ? (
          <Text style={styles.auditCaption}>
            Última ação por {item.updatedBy} em {formatDateTime(item.updatedAt)}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <CustomButton
            title="Editar"
            icon="edit-2"
            variant="outline"
            compact
            onPress={() =>
              navigation.navigate('PointForm', { editPointId: item.id })
            }
            style={styles.flexBtn}
          />
          <CustomButton
            title={item.active ? 'Desativar' : 'Reativar'}
            icon={item.active ? 'eye-off' : 'eye'}
            variant={item.active ? 'secondary' : 'primary'}
            compact
            onPress={() => handleToggleActive(item)}
            style={styles.flexBtn}
          />
          <CustomButton
            title="Excluir"
            icon="trash-2"
            variant="danger"
            compact
            onPress={() => handleDeletePoint(item)}
            style={styles.flexBtn}
          />
        </View>
      </View>
    ),
    [navigation, handleToggleActive, handleDeletePoint],
  );

  const renderReportItem = useCallback(
    ({ item }: ListRenderItemInfo<DefectReport>) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  item.status === 'open' ? colors.warning : colors.success,
              },
            ]}
          >
            <AppIcon
              name={item.status === 'open' ? 'alert-triangle' : 'check-circle'}
              size={20}
              color={colors.textOnPrimary}
            />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardCategory}>
              {item.status === 'open' ? 'Relato em aberto' : 'Relato resolvido'}
            </Text>
            <Text style={styles.cardTitle}>{item.pointName}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
        ) : null}

        <Text style={styles.detailMeta}>
          Enviado por {item.createdByName} em {formatDateTime(item.createdAt)}
          {item.resolvedBy && item.resolvedAt
            ? `\nResolvido por ${item.resolvedBy} em ${formatDateTime(item.resolvedAt)}`
            : ''}
        </Text>

        <View style={styles.actionsRow}>
          {item.status === 'open' ? (
            <CustomButton
              title="Marcar resolvido"
              icon="check"
              compact
              onPress={() => handleResolveReport(item)}
              style={styles.flexBtn}
            />
          ) : null}
          <CustomButton
            title="Ver ponto"
            icon="map-pin"
            variant="outline"
            compact
            onPress={() =>
              navigation.navigate('PointDetail', { pointId: item.pointId })
            }
            style={styles.flexBtn}
          />
          <CustomButton
            title="Excluir"
            icon="trash-2"
            variant="danger"
            compact
            onPress={() => handleDeleteReport(item)}
            style={styles.flexBtn}
          />
        </View>
      </View>
    ),
    [handleResolveReport, handleDeleteReport, navigation],
  );

  if (!session || !isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.unauthBox}>
          <EmptyState
            icon="lock"
            title="Acesso restrito à Administração"
            message="Esta área é exclusiva para a conta de coordenação/administrador do CitizenTech."
            actionLabel="Entrar como Administrador"
            onAction={() =>
              navigation.navigate('Login', {
                redirectTo: { target: 'Admin' },
              })
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <Text style={styles.title}>Painel de Administração</Text>
          <Text style={styles.subtitle}>{session.email}</Text>
        </View>
        <View style={styles.topHeaderActions}>
          <CustomButton
            title="Novo ponto"
            icon="plus-circle"
            compact
            onPress={() => navigation.navigate('PointForm')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta de administrador"
            onPress={logout}
            style={styles.logoutBtn}
          >
            <AppIcon name="log-out" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Control das 3 abas administrativas */}
      <View style={styles.tabsBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'requests' }}
          onPress={() => setActiveTab('requests')}
          style={[
            styles.tabItem,
            activeTab === 'requests' && styles.tabItemActive,
          ]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'requests' && styles.tabItemTextActive,
            ]}
          >
            Pedidos ({pendingCount})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'points' }}
          onPress={() => setActiveTab('points')}
          style={[
            styles.tabItem,
            activeTab === 'points' && styles.tabItemActive,
          ]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'points' && styles.tabItemTextActive,
            ]}
          >
            Pontos ({approvedCount})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'reports' }}
          onPress={() => setActiveTab('reports')}
          style={[
            styles.tabItem,
            activeTab === 'reports' && styles.tabItemActive,
          ]}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'reports' && styles.tabItemTextActive,
            ]}
          >
            Relatos ({openReportsCount})
          </Text>
        </Pressable>
      </View>

      {/* Subfiltros por status conforme a aba ativa */}
      {activeTab === 'requests' ? (
        <View style={styles.subFilterRow}>
          {(
            [
              { key: 'pending', label: 'Pendentes' },
              { key: 'rejected', label: 'Rejeitados' },
              { key: 'all', label: 'Todos' },
            ] as const
          ).map((f) => (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              onPress={() => setRequestFilter(f.key)}
              style={[
                styles.filterPill,
                requestFilter === f.key && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  requestFilter === f.key && styles.filterPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {activeTab === 'points' ? (
        <View style={styles.pointsControls}>
          <View style={styles.subFilterRow}>
            {(
              [
                { key: 'all', label: 'Todos' },
                { key: 'active', label: 'Ativos' },
                { key: 'inactive', label: 'Inativos' },
              ] as const
            ).map((f) => (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                onPress={() => setApprovedFilter(f.key)}
                style={[
                  styles.filterPill,
                  approvedFilter === f.key && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    approvedFilter === f.key && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.searchBar}>
            <AppIcon name="search" size={16} color={colors.textMuted} />
            <TextInput
              placeholder="Filtrar ponto por nome ou endereço..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>
        </View>
      ) : null}

      {activeTab === 'reports' ? (
        <View style={styles.subFilterRow}>
          {(
            [
              { key: 'open', label: 'Em aberto' },
              { key: 'resolved', label: 'Resolvidos' },
              { key: 'all', label: 'Todos' },
            ] as const
          ).map((f) => (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              onPress={() => setReportFilter(f.key)}
              style={[
                styles.filterPill,
                reportFilter === f.key && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  reportFilter === f.key && styles.filterPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Lista principal */}
      {activeTab === 'requests' ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="Nenhum pedido nesta fila"
              message="Novas solicitações de pontos de apoio enviadas pelos usuários aparecerão aqui para aprovação."
            />
          }
        />
      ) : activeTab === 'points' ? (
        <FlatList
          data={filteredApprovedPoints}
          keyExtractor={(item) => item.id}
          renderItem={renderApprovedPointItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="map-pin"
              title="Nenhum ponto encontrado"
              message="Ajuste o filtro ou cadastre um novo ponto de apoio."
            />
          }
        />
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={renderReportItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="Nenhum relato encontrado"
              message="Não há relatos de defeito para o filtro selecionado."
            />
          }
        />
      )}

      {/* Modal para informar motivo ao rejeitar um pedido */}
      <Modal
        visible={rejectTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rejeitar solicitação</Text>
            <Text style={styles.modalSubtitle}>
              Ponto: {rejectTarget?.name}
            </Text>
            <FormField
              label="Motivo da rejeição (visível ao solicitante)"
              placeholder="Ex.: Endereço incompleto ou local sem acesso público."
              multiline
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <View style={styles.actionsRow}>
              <CustomButton
                title="Cancelar"
                variant="outline"
                compact
                onPress={() => setRejectTarget(null)}
                style={styles.flexBtn}
              />
              <CustomButton
                title="Confirmar rejeição"
                variant="danger"
                compact
                onPress={handleConfirmReject}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  unauthBox: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  topHeaderLeft: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  tabItemText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabItemTextActive: {
    color: colors.primary,
  },
  pointsControls: {
    gap: spacing.xs,
  },
  subFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  filterPill: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.text,
  },
  filterPillTextActive: {
    color: colors.textOnPrimary,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    minHeight: 44,
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
    fontSize: fontSize.small,
    color: colors.text,
    paddingVertical: 6,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  badgeInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardCategory: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  statePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  stateActive: {
    backgroundColor: colors.successLight,
  },
  stateInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  statePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stateActiveText: {
    color: colors.success,
  },
  stateInactiveText: {
    color: colors.textMuted,
  },
  description: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  detailBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 3,
  },
  detailLine: {
    fontSize: fontSize.caption,
    color: colors.text,
    fontWeight: '500',
  },
  detailMeta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  rejectionNote: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 2,
  },
  auditCaption: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  flexBtn: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});
