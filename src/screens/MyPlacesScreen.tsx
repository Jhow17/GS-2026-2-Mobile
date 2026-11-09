/**
 * Tela Meus espaços.
 * Lista os pontos cadastrados pelo perfil atual (myPoints) com badge de status
 * (em análise, aprovado, rejeitado com o motivo, desativado) e permite Desativar
 * os aprovados ou Reativar os desativados com confirmação (Alert.alert).
 * Sem perfil: orienta a se identificar.
 */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Loading } from '../components/Loading';
import { ProfileModal } from '../components/ProfileModal';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors, statusColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { MyPlacesNavigation } from '../types/navigation';
import type { SupportPoint, SupportPointStatus } from '../types/supportPoint';
import {
  formatDateTime,
  pointStatusLabels,
  pointTypeIcons,
  pointTypeLabels,
} from '../utils/formatters';

export function MyPlacesScreen() {
  const navigation = useNavigation<MyPlacesNavigation>();
  const { profile, loading: profileLoading, saveProfile } = useProfile();
  const { myPoints, loading, error, reload, changeStatus } = useSupportPoints();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleActive = useCallback(
    (point: SupportPoint): void => {
      const nextStatus: SupportPointStatus =
        point.status === 'aprovado' ? 'desativado' : 'aprovado';
      const title =
        nextStatus === 'desativado' ? 'Desativar este espaço?' : 'Reativar este espaço?';
      const message =
        nextStatus === 'desativado'
          ? 'O ponto deixará de aparecer no mapa e na tela inicial até você reativá-lo.'
          : 'O ponto voltará a ficar visível no mapa e na tela inicial.';

      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: nextStatus === 'desativado' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingId(point.id);
            try {
              await changeStatus(point.id, nextStatus);
            } catch {
              Alert.alert('Atenção', 'Não foi possível atualizar o status deste espaço.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]);
    },
    [changeStatus],
  );

  const handleNewPoint = useCallback((): void => {
    if (!profile) {
      setProfileModalVisible(true);
      return;
    }
    navigation.navigate('PointForm', { mode: 'novo_ponto' });
  }, [navigation, profile]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SupportPoint>) => {
      const canToggle = item.status === 'aprovado' || item.status === 'desativado';
      const isUpdating = updatingId === item.id;
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.pointName} numberOfLines={1}>
              {pointTypeIcons[item.type]} {item.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: statusColors[item.status] }]}>
              <Text style={styles.badgeText}>{pointStatusLabels[item.status]}</Text>
            </View>
          </View>

          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.photo} />
          ) : null}

          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.meta}>
            {pointTypeLabels[item.type]} · Atualizado em {formatDateTime(item.updatedAt)}
          </Text>

          {item.status === 'rejeitado' && item.rejectionReason ? (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionTitle}>Motivo da rejeição:</Text>
              <Text style={styles.rejectionReason}>{item.rejectionReason}</Text>
            </View>
          ) : null}

          {canToggle ? (
            <CustomButton
              title={item.status === 'aprovado' ? 'Desativar' : 'Reativar'}
              variant={item.status === 'aprovado' ? 'danger' : 'primary'}
              compact
              loading={isUpdating}
              onPress={() => handleToggleActive(item)}
            />
          ) : null}
        </View>
      );
    },
    [handleToggleActive, updatingId],
  );

  const keyExtractor = useCallback((item: SupportPoint) => item.id, []);

  // Estado 1: Carregando.
  if (loading || profileLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Carregando seus espaços..." />
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

  // Sem perfil: orientação para se identificar.
  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon="👤"
          title="Identifique-se para ver seus espaços"
          message="Informe seu nome para cadastrar pontos de apoio e acompanhar o status dos seus envios."
          actionLabel="Informar meu nome"
          onAction={() => setProfileModalVisible(true)}
        />
        <ProfileModal
          visible={profileModalVisible}
          initialProfile={profile}
          onClose={() => setProfileModalVisible(false)}
          onSave={saveProfile}
        />
      </SafeAreaView>
    );
  }

  // Estado 3: Vazio ("Você ainda não cadastrou nenhum espaço").
  if (myPoints.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title="Você ainda não cadastrou nenhum espaço"
          message="Cadastre um bebedouro, área de sombra ou ponto de descanso para ajudar outros trabalhadores."
          actionLabel="Cadastrar um ponto"
          onAction={handleNewPoint}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={myPoints}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
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
    gap: spacing.sm,
  },
  card: {
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
  pointName: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  photo: {
    width: '100%',
    height: 144,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  description: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  rejectionBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  rejectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.danger,
  },
  rejectionReason: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.text,
  },
});
