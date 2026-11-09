/**
 * Tela 3 · Formulário de colaboração.
 * - modo 'novo_ponto': tipo, nome, descrição, horário (24h ou HH:mm), comodidades,
 *   localização ("Usar minha localização", PermissionNotice e mini mapa em que o toque
 *   reposiciona o marcador) e foto obrigatória pela câmera (copiada para documentos).
 * - modo 'bebedouro_avariado': bebedouro pré-selecionado ou lista dos bebedouros mais
 *   próximos para escolher, descrição do defeito e foto opcional.
 */
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraCapture } from '../components/CameraCapture';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { PermissionNotice } from '../components/PermissionNotice';
import { PointListItem } from '../components/PointListItem';
import { ProfileModal } from '../components/ProfileModal';
import { DEFAULT_REGION } from '../config/appConfig';
import { useLocation } from '../hooks/useLocation';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import * as photoService from '../services/photoService';
import { colors, pointTypeColors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { PointFormNavigation, PointFormRoute } from '../types/navigation';
import type { NewReportInput } from '../types/report';
import type { NewSupportPointInput, SupportPoint, SupportPointType } from '../types/supportPoint';
import { calculateDistanceMeters } from '../utils/distance';
import { formatCoordinates, pointTypeIcons, pointTypeLabels } from '../utils/formatters';
import { validatePointInput, validateReportInput } from '../utils/validation';

const POINT_TYPES: readonly SupportPointType[] = ['bebedouro', 'descanso', 'sombra', 'outro'];

interface FountainWithDistance {
  point: SupportPoint;
  distanceMeters: number;
}

export function PointFormScreen() {
  const navigation = useNavigation<PointFormNavigation>();
  const route = useRoute<PointFormRoute>();
  const { mode, pointId: initialPointId } = route.params;

  const { profile, saveProfile } = useProfile();
  const { coordinates, permission, requestPermission, openSettings } = useLocation();
  const { points, openReportsByPoint, addPoint, addReport } = useSupportPoints();

  // Estado do formulário de novo ponto.
  const [type, setType] = useState<SupportPointType>('bebedouro');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [is24h, setIs24h] = useState(true);
  const [opensAt, setOpensAt] = useState('08:00');
  const [closesAt, setClosesAt] = useState('18:00');
  const [hasShade, setHasShade] = useState(true);
  const [hasColdWater, setHasColdWater] = useState(false);
  const [hasSeating, setHasSeating] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  // Estado do formulário de bebedouro avariado.
  const [selectedFountainId, setSelectedFountainId] = useState<string>(initialPointId ?? '');

  // Controle geral.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Preenche coordenadas automaticamente na primeira leitura da localização.
  useEffect(() => {
    if (coordinates && latitude === null && longitude === null) {
      setLatitude(coordinates.latitude);
      setLongitude(coordinates.longitude);
    }
  }, [coordinates, latitude, longitude]);

  const referenceCoords = useMemo(
    () =>
      coordinates ?? {
        latitude: DEFAULT_REGION.latitude,
        longitude: DEFAULT_REGION.longitude,
      },
    [coordinates],
  );

  /** Bebedouros públicos ordenados do mais próximo ao mais distante. */
  const fountainsByDistance = useMemo<FountainWithDistance[]>(() => {
    const fountains = points
      .filter((point) => point.type === 'bebedouro')
      .map((point) => ({
        point,
        distanceMeters: calculateDistanceMeters(referenceCoords, point),
      }));
    return [...fountains].sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [points, referenceCoords]);

  const preselectedFountain = useMemo<SupportPoint | null>(
    () =>
      initialPointId ? (points.find((point) => point.id === initialPointId) ?? null) : null,
    [initialPointId, points],
  );

  const handleUseMyLocation = useCallback(async (): Promise<void> => {
    if (coordinates) {
      setLatitude(coordinates.latitude);
      setLongitude(coordinates.longitude);
      return;
    }
    const nextState = await requestPermission();
    if (nextState !== 'granted') {
      Alert.alert(
        'Atenção',
        'Permita a localização ou toque no mini mapa para posicionar o ponto.',
      );
    }
  }, [coordinates, requestPermission]);

  const handleMapPress = useCallback((event: MapPressEvent): void => {
    const { latitude: pressedLat, longitude: pressedLon } = event.nativeEvent.coordinate;
    setLatitude(pressedLat);
    setLongitude(pressedLon);
  }, []);

  const handleSelectFountain = useCallback((point: SupportPoint): void => {
    setSelectedFountainId(point.id);
  }, []);

  const handleSaveNewPoint = useCallback(async (): Promise<void> => {
    if (!profile) {
      setProfileModalVisible(true);
      return;
    }

    const input: NewSupportPointInput = {
      type,
      name,
      description,
      latitude,
      longitude,
      is24h,
      opensAt,
      closesAt,
      hasShade,
      hasColdWater,
      hasSeating,
      photoUri,
    };

    const validation = validatePointInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstMessage =
        Object.values(validation.errors)[0] ?? 'Confira os campos destacados antes de enviar.';
      Alert.alert('Atenção', firstMessage);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const persistedPhotoUri = input.photoUri
        ? await photoService.persistPhoto(input.photoUri)
        : undefined;
      await addPoint({ ...input, photoUri: persistedPhotoUri });
      Alert.alert(
        'Sucesso',
        'Seu ponto foi enviado e ficou em análise. Ele aparecerá no mapa assim que for aprovado.',
        [{ text: 'Ver meus espaços', onPress: () => navigation.replace('MyPlaces') }],
      );
    } catch {
      Alert.alert('Atenção', 'Não foi possível salvar o ponto agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }, [
    addPoint,
    closesAt,
    description,
    hasColdWater,
    hasSeating,
    hasShade,
    is24h,
    latitude,
    longitude,
    name,
    navigation,
    opensAt,
    photoUri,
    profile,
    type,
  ]);

  const handleSaveReport = useCallback(async (): Promise<void> => {
    if (!profile) {
      setProfileModalVisible(true);
      return;
    }

    const input: NewReportInput = {
      pointId: selectedFountainId,
      description,
      photoUri,
    };

    const validation = validateReportInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstMessage =
        Object.values(validation.errors)[0] ?? 'Confira os campos destacados antes de enviar.';
      Alert.alert('Atenção', firstMessage);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const persistedPhotoUri = input.photoUri
        ? await photoService.persistPhoto(input.photoUri)
        : undefined;
      await addReport({ ...input, photoUri: persistedPhotoUri });
      Alert.alert(
        'Sucesso',
        'Seu relato foi registrado. Obrigado por avisar outros trabalhadores!',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Atenção', 'Não foi possível enviar o relato agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }, [addReport, description, navigation, photoUri, profile, selectedFountainId]);

  const miniMapRegion: Region = {
    latitude: latitude ?? referenceCoords.latitude,
    longitude: longitude ?? referenceCoords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  if (mode === 'bebedouro_avariado') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.keyboard}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.heading}>Reportar bebedouro avariado</Text>
            <Text style={styles.subheading}>
              Avise se o bebedouro está quebrado, sem água ou fechado fora do horário.
            </Text>

            {preselectedFountain ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Bebedouro selecionado</Text>
                <PointListItem
                  point={preselectedFountain}
                  distanceMeters={calculateDistanceMeters(referenceCoords, preselectedFountain)}
                  reportCount={openReportsByPoint[preselectedFountain.id] ?? 0}
                  selected
                  onPress={handleSelectFountain}
                />
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Escolha o bebedouro *</Text>
                {fountainsByDistance.length === 0 ? (
                  <EmptyState
                    title="Nenhum bebedouro aprovado"
                    message="Ainda não há bebedouros públicos cadastrados para reportar."
                  />
                ) : (
                  fountainsByDistance.map(({ point, distanceMeters }) => (
                    <PointListItem
                      key={point.id}
                      point={point}
                      distanceMeters={distanceMeters}
                      reportCount={openReportsByPoint[point.id] ?? 0}
                      selected={selectedFountainId === point.id}
                      onPress={handleSelectFountain}
                    />
                  ))
                )}
                {errors.pointId ? <Text style={styles.errorText}>{errors.pointId}</Text> : null}
              </View>
            )}

            <FormField
              label="Qual é o problema? *"
              placeholder="Ex.: Torneira quebrada e sem água desde hoje cedo."
              multiline
              value={description}
              onChangeText={setDescription}
              error={errors.description}
              hint="De 10 a 280 caracteres."
              maxLength={280}
            />

            <CameraCapture
              label="Foto do problema (opcional)"
              photoUri={photoUri}
              onChangePhoto={setPhotoUri}
            />

            <CustomButton
              title="Enviar relato"
              onPress={handleSaveReport}
              loading={saving}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <ProfileModal
          visible={profileModalVisible}
          initialProfile={profile}
          onClose={() => setProfileModalVisible(false)}
          onSave={saveProfile}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Cadastrar ponto de apoio</Text>
          <Text style={styles.subheading}>
            Seu envio ficará em análise até ser aprovado. Você poderá desativar o espaço quando
            quiser em Meus espaços.
          </Text>

          {/* Tipo do ponto */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tipo do espaço *</Text>
            <View style={styles.typeGrid}>
              {POINT_TYPES.map((option) => {
                const active = type === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setType(option)}
                    style={[
                      styles.typeOption,
                      active && {
                        backgroundColor: pointTypeColors[option],
                        borderColor: pointTypeColors[option],
                      },
                    ]}
                  >
                    <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>
                      {pointTypeIcons[option]} {pointTypeLabels[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}
          </View>

          <FormField
            label="Nome do ponto *"
            placeholder="Ex.: Bebedouro da Praça Central"
            value={name}
            onChangeText={setName}
            error={errors.name}
            hint="De 3 a 60 caracteres."
            maxLength={60}
          />

          <FormField
            label="Descrição e referência *"
            placeholder="Explique onde fica e como acessar (ex.: ao lado da banca de jornal)."
            multiline
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            hint="De 10 a 280 caracteres."
            maxLength={280}
          />

          {/* Horário */}
          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <Text style={styles.sectionTitle}>Aberto 24 horas</Text>
              <Switch
                value={is24h}
                onValueChange={setIs24h}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={is24h ? colors.primary : colors.disabled}
              />
            </View>
            {!is24h ? (
              <View style={styles.hoursRow}>
                <View style={styles.hourColumn}>
                  <FormField
                    label="Abre às (HH:mm)"
                    placeholder="08:00"
                    value={opensAt}
                    onChangeText={setOpensAt}
                    error={errors.opensAt}
                    maxLength={5}
                  />
                </View>
                <View style={styles.hourColumn}>
                  <FormField
                    label="Fecha às (HH:mm)"
                    placeholder="18:00"
                    value={closesAt}
                    onChangeText={setClosesAt}
                    error={errors.closesAt}
                    maxLength={5}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Comodidades */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comodidades</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🌳 Tem sombra</Text>
              <Switch
                value={hasShade}
                onValueChange={setHasShade}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={hasShade ? colors.primary : colors.disabled}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🧊 Tem água gelada</Text>
              <Switch
                value={hasColdWater}
                onValueChange={setHasColdWater}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={hasColdWater ? colors.primary : colors.disabled}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🪑 Tem assentos para descanso</Text>
              <Switch
                value={hasSeating}
                onValueChange={setHasSeating}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={hasSeating ? colors.primary : colors.disabled}
              />
            </View>
          </View>

          {/* Localização + mini mapa */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Localização *</Text>
            {permission !== 'granted' ? (
              <PermissionNotice
                title="Permissão de localização"
                description="Permita o uso do GPS ou toque no mini mapa abaixo para marcar o local."
                permission={permission}
                onRequestPermission={requestPermission}
                onOpenSettings={openSettings}
              />
            ) : null}

            <CustomButton
              title="📍 Usar minha localização atual"
              variant="outline"
              compact
              onPress={handleUseMyLocation}
            />

            <Text style={styles.mapHint}>
              Toque no mapa para ajustar a posição exata do marcador:
            </Text>
            <View style={styles.miniMapBox}>
              <MapView
                style={styles.miniMap}
                region={miniMapRegion}
                onPress={handleMapPress}
              >
                {latitude !== null && longitude !== null ? (
                  <Marker coordinate={{ latitude, longitude }} />
                ) : null}
              </MapView>
            </View>

            <Text style={styles.coordinatesText}>
              {latitude !== null && longitude !== null
                ? `Coordenadas: ${formatCoordinates(latitude, longitude)}`
                : 'Nenhuma coordenada selecionada ainda.'}
            </Text>
            {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
          </View>

          {/* Foto obrigatória */}
          <CameraCapture
            label="Foto do local *"
            photoUri={photoUri}
            onChangePhoto={setPhotoUri}
            error={errors.photo}
          />

          <CustomButton
            title="Enviar para avaliação"
            onPress={handleSaveNewPoint}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ProfileModal
        visible={profileModalVisible}
        initialProfile={profile}
        onClose={() => setProfileModalVisible(false)}
        onSave={saveProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
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
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeOptionText: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  typeOptionTextActive: {
    color: colors.textOnPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  switchLabel: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hourColumn: {
    flex: 1,
  },
  mapHint: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  miniMapBox: {
    height: 184,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniMap: {
    flex: 1,
  },
  coordinatesText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.text,
  },
  errorText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.danger,
  },
});
