/**
 * Tela de Cadastro de Usuário (M5):
 * Campos: Nome, E-mail, CEP (com máscara 00000-000 e validação automática no ViaCEP),
 * Senha e Confirmação de Senha.
 * Respeita minimização de dados (LGPD): armazena apenas CEP, bairro, cidade e UF.
 * Nunca cria contas de administrador por esta tela pública.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppIcon } from '../components/AppIcon';
import { CustomButton } from '../components/CustomButton';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { AuthError } from '../services/authStorage';
import { lookupCep, ViaCepError } from '../services/viaCepService';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { ViaCepAddress } from '../types/auth';
import type { PostLoginRedirect, RootStackParamList } from '../types/navigation';
import { formatCep, stripCep } from '../utils/formatters';
import { validateRegisterInput } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ route, navigation }: Props) {
  const { register } = useAuth();
  const redirectTo = route.params?.redirectTo;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [cepInfo, setCepInfo] = useState<ViaCepAddress | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleCepLookup = useCallback(async (rawCep: string): Promise<void> => {
    const digits = stripCep(rawCep);
    if (digits.length !== 8) {
      setCepInfo(null);
      return;
    }
    setCepLoading(true);
    setCepError(undefined);
    try {
      const resolved = await lookupCep(digits);
      setCepInfo(resolved);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.cep;
        return next;
      });
    } catch (err: unknown) {
      setCepInfo(null);
      setCepError(
        err instanceof ViaCepError
          ? err.message
          : 'Não foi possível validar o CEP agora.',
      );
    } finally {
      setCepLoading(false);
    }
  }, []);

  const handleCepChange = useCallback(
    (text: string): void => {
      const formatted = formatCep(text);
      setCep(formatted);
      const digits = stripCep(formatted);
      if (digits.length === 8) {
        handleCepLookup(digits);
      } else {
        setCepInfo(null);
        setCepError(undefined);
      }
    },
    [handleCepLookup],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    let resolvedCep = cepInfo;
    if (!resolvedCep && stripCep(cep).length === 8) {
      try {
        setCepLoading(true);
        resolvedCep = await lookupCep(cep);
        setCepInfo(resolvedCep);
        setCepError(undefined);
      } catch (err: unknown) {
        setCepError(
          err instanceof ViaCepError
            ? err.message
            : 'Informe um CEP válido.',
        );
      } finally {
        setCepLoading(false);
      }
    }

    const input = {
      name,
      email,
      cep,
      password,
      confirmPassword,
      neighborhood: resolvedCep?.neighborhood,
      city: resolvedCep?.city,
      state: resolvedCep?.state,
    };

    const validation = validateRegisterInput(input, Boolean(resolvedCep));
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await register(input);
      navigateAfterAuth(redirectTo);
    } catch (err: unknown) {
      const msg =
        err instanceof AuthError
          ? err.message
          : 'Não foi possível criar sua conta agora. Tente novamente.';
      Alert.alert('Atenção', msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    cepInfo,
    cep,
    name,
    email,
    password,
    confirmPassword,
    register,
    navigateAfterAuth,
    redirectTo,
  ]);

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
            <AppIcon name="user" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Criar conta gratuita</Text>
          <Text style={styles.subtitle}>
            Identifique-se para sugerir novos pontos de apoio, relatar defeitos
            em bebedouros e acompanhar seus cadastros.
          </Text>
        </View>

        <View style={styles.formCard}>
          <FormField
            label="Nome ou apelido *"
            placeholder="Ex.: Carlos Silva"
            value={name}
            onChangeText={setName}
            error={errors.name}
            maxLength={60}
          />

          <FormField
            label="E-mail *"
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            maxLength={80}
          />

          <FormField
            label="CEP da sua região *"
            placeholder="00000-000"
            keyboardType="number-pad"
            maxLength={9}
            value={cep}
            onChangeText={handleCepChange}
            error={cepError ?? errors.cep}
            hint="Digite os 8 números do CEP para validar automaticamente no ViaCEP."
          />

          {cepLoading ? (
            <View style={styles.cepStatusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.cepStatusText}>Consultando CEP no ViaCEP...</Text>
            </View>
          ) : null}

          {cepInfo ? (
            <View style={styles.cepResolvedBox}>
              <AppIcon name="check-circle" size={16} color={colors.success} />
              <Text style={styles.cepResolvedText}>
                {cepInfo.neighborhood
                  ? `${cepInfo.neighborhood} · `
                  : ''}
                {cepInfo.city}/{cepInfo.state} (CEP {cepInfo.cep})
              </Text>
            </View>
          ) : null}

          <FormField
            label="Senha *"
            placeholder="Mínimo de 6 caracteres"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <FormField
            label="Confirmar senha *"
            placeholder="Repita a senha escolhida"
            secureTextEntry
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />

          <View style={styles.lgpdBox}>
            <AppIcon name="shield" size={15} color={colors.textMuted} />
            <Text style={styles.lgpdText}>
              Privacidade (LGPD): seu CEP é utilizado apenas para validar sua
              região de referência. Não exigimos número residencial e os dados
              ficam armazenados somente neste aparelho.
            </Text>
          </View>

          <CustomButton
            title="Concluir cadastro"
            icon="check"
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>

        <CustomButton
          title="Já tenho conta — Entrar"
          variant="outline"
          onPress={() => navigation.replace('Login', { redirectTo })}
        />
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...cardShadow,
  },
  cepStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  cepStatusText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  cepResolvedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  cepResolvedText: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.success,
  },
  lgpdBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  lgpdText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
