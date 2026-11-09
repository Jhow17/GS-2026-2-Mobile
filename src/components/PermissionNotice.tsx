/**
 * Aviso de permissão (localização ou câmera) com explicação e botão
 * adequado ao estado formal: "Permitir" ou "Abrir configurações".
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import type { LocationPermissionState } from '../types/location';
import { CustomButton } from './CustomButton';

interface PermissionNoticeProps {
  title: string;
  description: string;
  permission: LocationPermissionState;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
}

export function PermissionNotice({
  title,
  description,
  permission,
  onRequestPermission,
  onOpenSettings,
}: PermissionNoticeProps) {
  if (permission === 'granted') {
    return null;
  }

  const needsSettings = permission === 'blocked' || permission === 'services_disabled';
  const statusHelp =
    permission === 'blocked'
      ? 'A permissão está bloqueada no sistema. Abra as configurações do aplicativo para liberar.'
      : permission === 'services_disabled'
        ? 'O serviço de localização do aparelho está desligado. Ligue o GPS nas configurações.'
        : description;

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title}>📍 {title}</Text>
      <Text style={styles.description}>{statusHelp}</Text>
      <CustomButton
        title={needsSettings ? 'Abrir configurações' : 'Permitir'}
        variant={needsSettings ? 'outline' : 'primary'}
        compact
        onPress={needsSettings ? onOpenSettings : onRequestPermission}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.text,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
