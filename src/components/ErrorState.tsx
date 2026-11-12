/**
 * Estado de erro com ícone vetorial, mensagem amigável e botão "Tentar de novo".
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import { AppIcon } from './AppIcon';
import { CustomButton } from './CustomButton';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <AppIcon name="alert-triangle" size={28} color={colors.danger} />
      </View>
      <Text style={styles.title}>Algo deu errado</Text>
      <Text style={styles.message}>{message}</Text>
      <CustomButton
        title="Tentar de novo"
        icon="refresh-cw"
        onPress={onRetry}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: fontSize.body,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
