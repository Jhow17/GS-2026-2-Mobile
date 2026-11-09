/**
 * Modal de identificação local (nome obrigatório e contato opcional).
 * Não acessa storage diretamente: chama a função onSave recebida por props.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import type { CitizenProfile, ProfileInput } from '../types/profile';
import { validateProfileInput } from '../utils/validation';
import { CustomButton } from './CustomButton';
import { FormField } from './FormField';

interface ProfileModalProps {
  visible: boolean;
  initialProfile: CitizenProfile | null;
  onClose: () => void;
  onSave: (input: ProfileInput) => Promise<CitizenProfile>;
}

export function ProfileModal({
  visible,
  initialProfile,
  onClose,
  onSave,
}: ProfileModalProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialProfile?.name ?? '');
      setContact(initialProfile?.contact ?? '');
      setErrors({});
    }
  }, [visible, initialProfile]);

  const handleSave = useCallback(async (): Promise<void> => {
    const input: ProfileInput = { name, contact };
    const validation = validateProfileInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstMessage =
        Object.values(validation.errors)[0] ?? 'Confira os campos informados.';
      Alert.alert('Atenção', firstMessage);
      return;
    }

    setSaving(true);
    try {
      await onSave(input);
      onClose();
    } catch {
      Alert.alert('Atenção', 'Não foi possível salvar sua identificação. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }, [name, contact, onSave, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Sua identificação</Text>
          <Text style={styles.subtitle}>
            Estes dados ficam só neste aparelho e identificam os pontos ou relatos que você
            enviar.
          </Text>

          <FormField
            label="Seu nome ou apelido *"
            placeholder="Ex.: João (entregador)"
            value={name}
            onChangeText={setName}
            error={errors.name}
            maxLength={60}
          />
          <FormField
            label="Contato (opcional)"
            placeholder="Telefone ou e-mail, se quiser"
            value={contact}
            onChangeText={setContact}
            error={errors.contact}
            maxLength={80}
          />

          <View style={styles.actions}>
            <CustomButton
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              disabled={saving}
              style={styles.button}
            />
            <CustomButton
              title="Salvar"
              onPress={handleSave}
              loading={saving}
              style={styles.button}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: fontSize.small,
    fontWeight: '400',
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
  },
});
