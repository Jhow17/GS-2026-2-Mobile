/**
 * Aba Colaborar.
 * Mostra o cartão do perfil local, as ações de colaboração ("Cadastrar um ponto",
 * "Reportar bebedouro com defeito" e "Meus espaços") e, no rodapé, o interruptor
 * do "Modo avaliador (demonstração)" com acesso à ReviewerScreen.
 * Consultar clima, mapa e detalhes nunca pede identificação; cadastrar ou reportar
 * abre o ProfileModal na primeira vez.
 */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '../components/CustomButton';
import { Loading } from '../components/Loading';
import { ProfileModal } from '../components/ProfileModal';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { CollaborateNavigation, PointFormMode } from '../types/navigation';
import type { ProfileInput } from '../types/profile';

export function CollaborateScreen() {
  const navigation = useNavigation<CollaborateNavigation>();
  const {
    profile,
    loading: profileLoading,
    saveProfile,
    clearProfile,
    reviewerMode,
    setReviewerMode,
  } = useProfile();
  const { myPoints, pendingPoints, openReports } = useSupportPoints();

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<PointFormMode | null>(null);

  const handleOpenProfileModal = useCallback((): void => {
    setPendingAction(null);
    setModalVisible(true);
  }, []);

  const handleStartAction = useCallback(
    (mode: PointFormMode): void => {
      if (!profile) {
        setPendingAction(mode);
        setModalVisible(true);
        return;
      }
      navigation.navigate('PointForm', { mode });
    },
    [navigation, profile],
  );

  const handleSaveProfile = useCallback(
    async (input: ProfileInput) => {
      const saved = await saveProfile(input);
      if (pendingAction) {
        const nextMode = pendingAction;
        setPendingAction(null);
        navigation.navigate('PointForm', { mode: nextMode });
      }
      return saved;
    },
    [navigation, pendingAction, saveProfile],
  );

  const handleClearProfile = useCallback((): void => {
    Alert.alert(
      'Sair deste perfil',
      'Sua identificação será removida deste aparelho. Os pontos já enviados permanecem salvos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            clearProfile().catch(() => {
              Alert.alert('Atenção', 'Não foi possível remover o perfil agora.');
            });
          },
        },
      ],
    );
  }, [clearProfile]);

  const handleToggleReviewerMode = useCallback(
    (value: boolean): void => {
      setReviewerMode(value).catch(() => {
        Alert.alert('Atenção', 'Não foi possível alterar o modo avaliador.');
      });
    },
    [setReviewerMode],
  );

  const handleOpenMyPlaces = useCallback((): void => {
    navigation.navigate('MyPlaces');
  }, [navigation]);

  const handleOpenReviewer = useCallback((): void => {
    navigation.navigate('Reviewer');
  }, [navigation]);

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Carregando seu perfil..." />
      </SafeAreaView>
    );
  }

  const totalToReview = pendingPoints.length + openReports.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Colaborar com a rede</Text>
        <Text style={styles.subheading}>
          Ajude outros trabalhadores indicando bebedouros, sombras e pontos de descanso, ou
          avisando quando um bebedouro estiver sem água.
        </Text>

        {/* Cartão do perfil */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sua identificação</Text>
          {profile ? (
            <>
              <Text style={styles.profileName}>👤 {profile.name}</Text>
              {profile.contact ? (
                <Text style={styles.profileContact}>📞 {profile.contact}</Text>
              ) : (
                <Text style={styles.profileContact}>Sem contato informado</Text>
              )}
              <View style={styles.profileButtons}>
                <CustomButton
                  title="Editar"
                  variant="outline"
                  compact
                  onPress={handleOpenProfileModal}
                  style={styles.halfButton}
                />
                <CustomButton
                  title="Sair deste perfil"
                  variant="danger"
                  compact
                  onPress={handleClearProfile}
                  style={styles.halfButton}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardDescription}>
                Você não precisa de conta para ver o clima e o mapa. Só pedimos seu nome na hora
                de enviar um ponto ou relato.
              </Text>
              <CustomButton
                title="Informar meu nome"
                variant="outline"
                compact
                onPress={handleOpenProfileModal}
              />
            </>
          )}
        </View>

        {/* Ações de colaboração */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações</Text>
          <Text style={styles.cardDescription}>
            Todo novo ponto passa pela avaliação antes de aparecer no mapa público.
          </Text>
          <CustomButton
            title="➕ Cadastrar um ponto"
            onPress={() => handleStartAction('novo_ponto')}
          />
          <CustomButton
            title="🔧 Reportar bebedouro com defeito"
            variant="secondary"
            onPress={() => handleStartAction('bebedouro_avariado')}
          />
          <CustomButton
            title={`📋 Meus espaços (${myPoints.length})`}
            variant="outline"
            onPress={handleOpenMyPlaces}
          />
        </View>

        {/* Rodapé: Modo avaliador (demonstração) */}
        <View style={styles.reviewerCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextBox}>
              <Text style={styles.cardTitle}>Modo avaliador (demonstração)</Text>
              <Text style={styles.cardDescription}>
                Simula no próprio aparelho a moderação que, em produção, ficaria no painel do
                administrador em um backend.
              </Text>
            </View>
            <Switch
              value={reviewerMode}
              onValueChange={handleToggleReviewerMode}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={reviewerMode ? colors.primary : colors.disabled}
            />
          </View>

          {reviewerMode ? (
            <CustomButton
              title={`🛡️ Avaliar envios (${totalToReview} pendente${totalToReview === 1 ? '' : 's'})`}
              onPress={handleOpenReviewer}
            />
          ) : null}
        </View>
      </ScrollView>

      <ProfileModal
        visible={modalVisible}
        initialProfile={profile}
        onClose={() => {
          setPendingAction(null);
          setModalVisible(false);
        }}
        onSave={handleSaveProfile}
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
  heading: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  subheading: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  reviewerCard: {
    backgroundColor: colors.infoLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.info,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  cardDescription: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  profileName: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  profileContact: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
  },
  profileButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  halfButton: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  switchTextBox: {
    flex: 1,
    gap: spacing.xxs,
  },
});
