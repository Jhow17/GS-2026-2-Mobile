/**
 * Captura de foto pela câmera (expo-camera) com tratamento formal de permissão
 * concedida, negada e bloqueada. Zero emojis (M1).
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import type { LocationPermissionState } from '../types/location';
import { CustomButton } from './CustomButton';
import { PermissionNotice } from './PermissionNotice';

interface CameraCaptureProps {
  photoUri?: string;
  onChangePhoto: (uri: string | undefined) => void;
  label?: string;
  error?: string;
}

export function CameraCapture({
  photoUri,
  onChangePhoto,
  label = 'Foto do local',
  error,
}: CameraCaptureProps) {
  const [permissionResponse, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  const permissionState: LocationPermissionState = !permissionResponse
    ? 'undetermined'
    : permissionResponse.granted
      ? 'granted'
      : permissionResponse.canAskAgain
        ? 'denied'
        : 'blocked';

  const handleOpenCamera = useCallback(async (): Promise<void> => {
    setCameraError(null);
    if (permissionResponse?.granted) {
      setCameraOpen(true);
      return;
    }
    const response = await requestPermission();
    if (response.granted) {
      setCameraOpen(true);
    }
  }, [permissionResponse, requestPermission]);

  const handleOpenSettings = useCallback((): void => {
    Linking.openSettings();
  }, []);

  const handleTakePicture = useCallback(async (): Promise<void> => {
    if (!cameraRef.current || capturing) {
      return;
    }
    setCapturing(true);
    setCameraError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        onChangePhoto(photo.uri);
        setCameraOpen(false);
      } else {
        setCameraError('Não foi possível registrar a foto. Tente de novo.');
      }
    } catch {
      setCameraError('Não foi possível registrar a foto. Tente de novo.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, onChangePhoto]);

  const handleRemovePhoto = useCallback((): void => {
    onChangePhoto(undefined);
  }, [onChangePhoto]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {permissionState === 'denied' || permissionState === 'blocked' ? (
        <PermissionNotice
          title="Permissão da câmera"
          description="Permita o uso da câmera para fotografar o ponto de apoio."
          permission={permissionState}
          onRequestPermission={handleOpenCamera}
          onOpenSettings={handleOpenSettings}
        />
      ) : null}

      {photoUri ? (
        <View style={styles.previewBox}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <CustomButton
              title="Tirar outra"
              icon="camera"
              variant="outline"
              compact
              onPress={handleOpenCamera}
              style={styles.actionButton}
            />
            <CustomButton
              title="Remover"
              icon="trash-2"
              variant="danger"
              compact
              onPress={handleRemovePhoto}
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : (
        <CustomButton
          title="Abrir câmera"
          icon="camera"
          variant="outline"
          onPress={handleOpenCamera}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={cameraOpen}
        animationType="slide"
        onRequestClose={() => setCameraOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onMountError={() =>
              setCameraError('Não foi possível iniciar a câmera neste aparelho.')
            }
          />
          {cameraError ? <Text style={styles.cameraError}>{cameraError}</Text> : null}
          <View style={styles.modalFooter}>
            <CustomButton
              title="Cancelar"
              variant="outline"
              onPress={() => setCameraOpen(false)}
              style={styles.actionButton}
            />
            <CustomButton
              title="Fotografar"
              icon="camera"
              onPress={handleTakePicture}
              loading={capturing}
              style={styles.actionButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  previewBox: {
    gap: spacing.xs,
  },
  preview: {
    width: '100%',
    height: 192,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  error: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.danger,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.text,
  },
  camera: {
    flex: 1,
  },
  cameraError: {
    padding: spacing.sm,
    backgroundColor: colors.dangerLight,
    color: colors.danger,
    fontSize: fontSize.small,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
});
