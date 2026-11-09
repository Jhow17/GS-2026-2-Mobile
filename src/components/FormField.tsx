/**
 * Campo de formulário com rótulo, dica e mensagem de erro.
 */
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, multiline, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    fontSize: fontSize.body,
    color: colors.text,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xxs,
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.danger,
  },
  hint: {
    marginTop: spacing.xxs,
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
