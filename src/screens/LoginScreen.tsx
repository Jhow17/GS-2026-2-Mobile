/**
 * Tela de Login (M5 e M6):
 * Autentica usuários comuns e o administrador semeado.
 * Após o login, se houver `redirectTo` nos parâmetros da rota, retoma
 * imediatamente a ação restrita que o usuário tentava executar.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
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

import { AppIcon } from '../components/AppIcon';
import { CustomButton } from '../components/CustomButton';
import { FormField } from '../components/FormField';
import { ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD } from '../config/appConfig';
import { useAuth } from '../hooks/useAuth';
import { AuthError } from '../services/authStorage';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { PostLoginRedirect, RootStackParamList } from '../types/navigation';
import { validateLoginInput } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ route, navigation }: Props) {
  const { login } = useAuth();
  const redirectTo = route.params?.redirectTo;
  const reasonMessage = route.params?.reasonMessage;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const navigateAfterAuth = useCallback(
    (targetRedirect: PostLoginRedirect | undefined): void => {
      if (!targetRedirect) {
        navigation.navigate('Tabs');
        return;
      }
      switch (targetRedirect.target) {
        case 'PointForm':
          navigation.replace('PointForm', targetRedirect.params);
          break;
        case 'PointDetail':
          navigation.replace('PointDetail', targetRedirect.params);
          break;
        case 'MyPlaces':
          navigation.replace('MyPlaces');
          break;
        default:
          navigation.navigate('Tabs');
          break;
      }
    },
    [navigation],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    const validation = validateLoginInput({ email, password });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await login({ email, password });
      navigateAfterAuth(redirectTo);
    } catch (err: unknown) {
      const msg =
        err instanceof AuthError
          ? err.message
          : 'Não foi possível entrar agora. Tente novamente.';
      Alert.alert('Falha no login', msg);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, navigateAfterAuth, redirectTo]);

  const handleFillAdminDemo = useCallback((): void => {
    setEmail(ADMIN_SEED_EMAIL);
    setPassword(ADMIN_SEED_PASSWORD);
    setErrors({});
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <View style={styles.iconBadge}>
            <AppIcon name="log-in" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Entrar no CitizenTech</Text>
          <Text style={styles.subtitle}>
            Acesse sua conta para cadastrar pontos de apoio, relatar bebedouros
            com defeito ou gerenciar seus locais.
          </Text>
        </View>

        {reasonMessage ? (
          <View style={styles.noticeBanner}>
            <AppIcon name="info" size={18} color={colors.info} />
            <Text style={styles.noticeText}>{reasonMessage}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <FormField
            label="E-mail *"
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <FormField
            label="Senha *"
            placeholder="Sua senha"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <CustomButton
            title="Entrar"
            icon="log-in"
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>

        <View style={styles.registerPromptCard}>
          <Text style={styles.registerPromptText}>
            Ainda não tem uma conta no CitizenTech?
          </Text>
          <CustomButton
            title="Criar conta gratuita"
            icon="user"
            variant="outline"
            onPress={() =>
              navigation.replace('Register', { redirectTo })
            }
          />
        </View>

        {/* Credenciais de demonstração da conta Admin semeada (facilita correção acadêmica) */}
        <View style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <AppIcon name="shield" size={16} color={colors.primaryDark} />
            <Text style={styles.demoTitle}>
              Acesso Administrativo (Demonstração)
            </Text>
          </View>
          <Text style={styles.demoText}>
            E-mail: {ADMIN_SEED_EMAIL}
            {'\n'}Senha: {ADMIN_SEED_PASSWORD}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preencher credenciais de administrador"
            onPress={handleFillAdminDemo}
            style={styles.demoFillBtn}
          >
            <Text style={styles.demoFillBtnText}>
              Preencher acesso de administrador
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerBlock: {
    gap: spacing.xs,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.info,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...cardShadow,
  },
  registerPromptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  registerPromptText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  demoCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.xs,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoTitle: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  demoText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  demoFillBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  demoFillBtnText: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.primary,
  },
});
