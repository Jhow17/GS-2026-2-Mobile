/**
 * Tela de Conta / Entrar (Aba "Conta" ou "Entrar" - M4 e M5):
 * - Visitante: exibe convite claro para entrar ou criar conta gratuita;
 * - Usuário logado / Admin: mostra dados da conta, CEP/região, atalho para
 *   "Meus pontos cadastrados" e botão de "Sair da conta".
 */
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../components/AppIcon';
import { CustomButton } from '../components/CustomButton';
import { useAuth } from '../hooks/useAuth';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { RootStackParamList, RootTabParamList } from '../types/navigation';

type AccountNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Account'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function AccountScreen() {
  const navigation = useNavigation<AccountNavigation>();
  const { session, isAdmin, logout } = useAuth();
  const { points } = useSupportPoints();

  const myPointsCount = session
    ? points.filter((p) => p.createdBy === session.userId).length
    : 0;

  const handleConfirmLogout = useCallback((): void => {
    Alert.alert('Sair da conta', 'Deseja encerrar sua sessão neste aparelho?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <AppIcon name="user" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Sua conta no CitizenTech</Text>
            <Text style={styles.subtitle}>
              Qualquer pessoa pode consultar alertas de calor e pontos de apoio
              sem login. Para sugerir novos locais, reportar bebedouros com
              defeito ou gerenciar seus pontos, entre na sua conta.
            </Text>

            <View style={styles.authActions}>
              <CustomButton
                title="Entrar na minha conta"
                icon="log-in"
                onPress={() => navigation.navigate('Login')}
              />
              <CustomButton
                title="Criar conta gratuita"
                icon="user"
                variant="outline"
                onPress={() => navigation.navigate('Register')}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenHeader}>Minha Conta</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <AppIcon
                name={isAdmin ? 'shield' : 'user'}
                size={26}
                color={colors.primary}
              />
            </View>
            <View style={styles.profileHeaderText}>
              <Text style={styles.profileName}>{session.name}</Text>
              <Text style={styles.profileEmail}>{session.email}</Text>
              <View
                style={[
                  styles.roleBadge,
                  isAdmin ? styles.roleAdmin : styles.roleUser,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    isAdmin ? styles.roleAdminText : styles.roleUserText,
                  ]}
                >
                  {isAdmin ? 'Administrador' : 'Cidadão / Trabalhador Conectado'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <AppIcon name="map-pin" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>
              CEP {session.cep}
              {session.neighborhood ? ` · ${session.neighborhood}` : ''}
              {session.city && session.state
                ? ` — ${session.city}/${session.state}`
                : ''}
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.sectionTitle}>Suas colaborações</Text>
          <Text style={styles.sectionDescription}>
            Você possui {myPointsCount} ponto(s) solicitado(s) ou cadastrado(s)
            neste aparelho.
          </Text>
          <CustomButton
            title="Gerenciar meus pontos cadastrados"
            icon="map-pin"
            variant="outline"
            onPress={() => navigation.navigate('MyPlaces')}
          />
          <CustomButton
            title="Sugerir novo ponto de apoio"
            icon="plus-circle"
            onPress={() => navigation.navigate('PointForm')}
          />
        </View>

        <CustomButton
          title="Sair da conta"
          icon="log-out"
          variant="danger"
          onPress={handleConfirmLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  screenHeader: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...cardShadow,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  authActions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileHeaderText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: 4,
  },
  roleUser: {
    backgroundColor: colors.primarySubtle,
  },
  roleAdmin: {
    backgroundColor: colors.secondaryLight,
  },
  roleBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  roleUserText: {
    color: colors.primaryDark,
  },
  roleAdminText: {
    color: colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
});
