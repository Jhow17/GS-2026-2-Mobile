/**
 * Tela "Colaborar" (M1, M4, M6):
 * Visível para usuários autenticados (cidadãos e administradores).
 * Permite:
 * 1) Abrir o formulário para pedir o cadastro de um ponto de apoio novo;
 * 2) Informar que um bebedouro cadastrado está com defeito (com foto opcional);
 * 3) Acessar a tela "Meus pontos cadastrados".
 * Zero emojis e sem ProfileModal (usa a sessão autenticada do AuthContext).
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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../components/AppIcon';
import { CameraCapture } from '../components/CameraCapture';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList, RootTabParamList } from '../types/navigation';
import type { SupportPoint } from '../types/supportPoint';
import { validateReportInput } from '../utils/validation';

type CollaborateNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Collaborate'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function CollaborateScreen() {
  const navigation = useNavigation<CollaborateNavigation>();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { points, reportDefect } = useSupportPoints();

  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Bebedouros aprovados e ativos (ou pontos que oferecem água potável)
  const drinkingPoints = useMemo<SupportPoint[]>(
    () =>
      points.filter(
        (point) =>
          point.status === 'approved' &&
          point.active &&
          (point.type === 'bebedouro' ||
            point.amenities.includes('agua_potavel')),
      ),
    [points],
  );

  const selectedPoint = useMemo<SupportPoint | undefined>(
    () => drinkingPoints.find((point) => point.id === selectedPointId),
    [drinkingPoints, selectedPointId],
  );

  const handleNewPointPress = useCallback((): void => {
    if (!session || !profile) {
      navigation.navigate('Login', {
        redirectTo: { target: 'PointForm' },
        reasonMessage:
          'Entre na sua conta para sugerir o cadastro de um ponto de apoio.',
      });
      return;
    }
    navigation.navigate('PointForm');
  }, [session, profile, navigation]);

  const handleToggleReportForm = useCallback((): void => {
    if (!session || !profile) {
      navigation.navigate('Login', {
        redirectTo: { target: 'Collaborate' },
        reasonMessage:
          'Entre na sua conta para relatar um bebedouro com defeito.',
      });
      return;
    }
    setReportFormOpen((prev) => !prev);
    setErrors({});
  }, [session, profile, navigation]);

  const handleSubmitReport = useCallback(async (): Promise<void> => {
    if (!profile) {
      navigation.navigate('Login', {
        redirectTo: { target: 'Collaborate' },
      });
      return;
    }
    const input = {
      pointId: selectedPointId,
      pointName: selectedPoint?.name ?? '',
      description,
      photoUri,
    };
    const validation = validateReportInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstMessage =
        Object.values(validation.errors)[0] ?? 'Confira os campos informados.';
      Alert.alert('Atenção', firstMessage);
      return;
    }

    setSubmitting(true);
    try {
      await reportDefect(input, profile);
      setSelectedPointId('');
      setDescription('');
      setPhotoUri(undefined);
      setErrors({});
      setReportFormOpen(false);
      Alert.alert(
        'Relato enviado',
        'Obrigado por avisar! O aviso já aparece nos detalhes do ponto e na fila da administração.',
      );
    } catch {
      Alert.alert(
        'Atenção',
        'Não foi possível enviar o relato agora. Tente de novo.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    profile,
    navigation,
    selectedPointId,
    selectedPoint,
    description,
    photoUri,
    reportDefect,
  ]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.unauthContainer}>
          <EmptyState
            icon="user"
            title="Entre para colaborar"
            message="Faça login ou crie uma conta gratuita para sugerir pontos de hidratação e descanso ou relatar problemas em bebedouros."
            actionLabel="Entrar na minha conta"
            onAction={() =>
              navigation.navigate('Login', {
                redirectTo: { target: 'Collaborate' },
              })
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Colaborar com a Rede</Text>
          <Text style={styles.subtitle}>
            Ajude outros entregadores e trabalhadores de rua indicando pontos de
            água, sombra e descanso ou avisando quando um bebedouro quebrar.
          </Text>

          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Conectado como</Text>
              <Text style={styles.profileName}>{session.name}</Text>
              <Text style={styles.profileContact}>
                {session.email} · CEP {session.cep}
              </Text>
            </View>
            <CustomButton
              title="Meus pontos"
              icon="map-pin"
              variant="outline"
              compact
              onPress={() => navigation.navigate('MyPlaces')}
            />
          </View>

          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIconBox}>
                <AppIcon name="plus-circle" size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionTitle}>
                Pedir cadastro de ponto de apoio
              </Text>
            </View>
            <Text style={styles.actionText}>
              Conhece um bebedouro público, praça sombreada, área de descanso ou
              comércio parceiro? Envie pelo GPS ou pelo CEP para aprovação.
            </Text>
            <CustomButton
              title="Novo ponto de apoio"
              icon="plus-circle"
              onPress={handleNewPointPress}
            />
          </View>

          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: colors.warningLight },
                ]}
              >
                <AppIcon name="tool" size={20} color={colors.warning} />
              </View>
              <Text style={styles.actionTitle}>
                Informar bebedouro com defeito
              </Text>
            </View>
            <Text style={styles.actionText}>
              Água desligada, torneira quebrada ou local fechado no horário em
              que deveria estar aberto.
            </Text>
            <CustomButton
              title={
                reportFormOpen ? 'Fechar formulário' : 'Relatar defeito'
              }
              icon={reportFormOpen ? 'x' : 'alert-triangle'}
              variant={reportFormOpen ? 'outline' : 'secondary'}
              onPress={handleToggleReportForm}
            />

            {reportFormOpen ? (
              <View style={styles.reportForm}>
                <Text style={styles.fieldLabel}>
                  Qual ponto está com problema? *
                </Text>
                {drinkingPoints.length === 0 ? (
                  <EmptyState
                    icon="droplet"
                    title="Nenhum bebedouro disponível"
                    message="Não há bebedouros ativos cadastrados no momento."
                  />
                ) : (
                  <View style={styles.pointsList}>
                    {drinkingPoints.map((point) => {
                      const active = point.id === selectedPointId;
                      return (
                        <Pressable
                          key={point.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => setSelectedPointId(point.id)}
                          style={[
                            styles.pointOption,
                            active && styles.pointOptionActive,
                          ]}
                        >
                          <View style={styles.pointOptionTextCol}>
                            <Text
                              style={[
                                styles.pointOptionName,
                                active && styles.pointOptionNameActive,
                              ]}
                            >
                              {point.name}
                            </Text>
                            <Text style={styles.pointOptionAddress}>
                              {point.address}
                            </Text>
                          </View>
                          {active ? (
                            <AppIcon
                              name="check-circle"
                              size={18}
                              color={colors.primary}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {errors.pointId ? (
                  <Text style={styles.error}>{errors.pointId}</Text>
                ) : null}

                <FormField
                  label="O que está acontecendo? *"
                  placeholder="Ex.: Sem água nas duas torneiras desde hoje cedo."
                  multiline
                  value={description}
                  onChangeText={setDescription}
                  error={errors.description}
                  maxLength={280}
                />

                <CameraCapture
                  label="Foto do problema (opcional)"
                  photoUri={photoUri}
                  onChangePhoto={setPhotoUri}
                />

                <CustomButton
                  title="Enviar relato"
                  icon="check"
                  onPress={handleSubmitReport}
                  loading={submitting}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  unauthContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: -spacing.xs,
  },
  profileCard: {
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
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  profileName: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  profileContact: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  actionText: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reportForm: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  pointsList: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pointOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  pointOptionActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySubtle,
  },
  pointOptionTextCol: {
    flex: 1,
  },
  pointOptionName: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  pointOptionNameActive: {
    color: colors.primaryDark,
  },
  pointOptionAddress: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  error: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
});
