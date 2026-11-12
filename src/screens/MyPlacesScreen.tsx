/**
 * Tela "Meus pontos cadastrados" (M1 e M6):
 * Lista os pontos criados pelo usuário autenticado, mostra o status da análise
 * (e eventual motivo de rejeição) e permite ativar/desativar pontos aprovados.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { AppIcon } from '../components/AppIcon';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList } from '../types/navigation';
import type { SupportPoint } from '../types/supportPoint';
import {
  formatDateTime,
  pointStatusLabels,
  pointTypeIconNames,
  pointTypeLabels,
} from '../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'MyPlaces'>;

export function MyPlacesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { points, toggleActive } = useSupportPoints();

  const myPoints = useMemo<SupportPoint[]>(() => {
    if (!session) {
      return [];
    }
    return points.filter((point) => point.createdBy === session.userId);
  }, [points, session]);

  const handleToggle = useCallback(
    async (point: SupportPoint, nextActive: boolean): Promise<void> => {
      try {
        await toggleActive(point.id, nextActive, session?.name);
      } catch {
        Alert.alert('Atenção', 'Não foi possível atualizar este ponto agora.');
      }
    },
    [toggleActive, session?.name],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SupportPoint>) => {
      const canToggle = item.status === 'approved';
      return (
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
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {pointTypeLabels[item.type]} · {item.address}
              </Text>
              <Text style={styles.meta}>
                Enviado em {formatDateTime(item.createdAt)}
              </Text>
            </View>
          </Pressable>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                item.status === 'approved'
                  ? styles.statusApproved
                  : item.status === 'rejected'
                    ? styles.statusRejected
                    : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  item.status === 'approved'
                    ? styles.statusApprovedText
                    : item.status === 'rejected'
                      ? styles.statusRejectedText
                      : styles.statusPendingText,
                ]}
              >
                {pointStatusLabels[item.status]}
              </Text>
            </View>

            {canToggle ? (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {item.active ? 'Ativo no mapa' : 'Desativado'}
                </Text>
                <Switch
                  accessibilityLabel={`Ativar ou desativar ${item.name}`}
                  value={item.active}
                  onValueChange={(value) => handleToggle(item, value)}
                  trackColor={{
                    false: colors.borderStrong,
                    true: colors.primaryLight,
                  }}
                  thumbColor={item.active ? colors.primary : colors.surface}
                />
              </View>
            ) : null}
          </View>

          {item.status === 'rejected' && item.rejectionReason ? (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>
                Motivo: {item.rejectionReason}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [navigation, handleToggle],
  );

  const keyExtractor = useCallback((item: SupportPoint): string => item.id, []);

  if (!session) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="user"
          title="Entre na sua conta"
          message="Faça login para visualizar e gerenciar os pontos de apoio que você cadastrou."
          actionLabel="Entrar"
          onAction={() =>
            navigation.replace('Login', {
              redirectTo: { target: 'MyPlaces' },
            })
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={myPoints}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="map-pin"
            title="Você ainda não cadastrou pontos"
            message="Quando você sugerir um bebedouro, área de sombra, descanso ou comércio parceiro, ele aparecerá aqui."
            actionLabel="Cadastrar ponto de apoio"
            onAction={() => navigation.navigate('PointForm')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  listContent: {
    flexGrow: 1,
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
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  statusBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  statusApproved: {
    backgroundColor: colors.successLight,
  },
  statusApprovedText: {
    color: colors.success,
  },
  statusPending: {
    backgroundColor: colors.warningLight,
  },
  statusPendingText: {
    color: colors.warning,
  },
  statusRejected: {
    backgroundColor: colors.dangerLight,
  },
  statusRejectedText: {
    color: colors.danger,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchLabel: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  rejectionBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.xs,
    padding: spacing.xs,
  },
  rejectionText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: '500',
  },
});
