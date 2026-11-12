/**
 * Formulário de Cadastro e Edição de Ponto de Apoio (M1, M6, M7 e M8):
 * - Exige usuário autenticado (se visitante, redireciona ao Login e retorna);
 * - Suporta modo de edição pelo Administrador (`editPointId`);
 * - Seletor de localização (M8):
 *   1) "Usar minha localização" (GPS via useLocation);
 *   2) "Informar endereço por CEP" (máscara 00000-000, consulta automática no ViaCEP,
 *      preenchimento de rua, bairro, cidade e UF, campos de número e complemento,
 *      geocodificação em cascata via geocodePointAddress e mini-mapa interativo).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { AppIcon } from '../components/AppIcon';
import { CameraCapture } from '../components/CameraCapture';
import { CustomButton } from '../components/CustomButton';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/FormField';
import { InteractiveMapView } from '../components/InteractiveMapView';
import { PermissionNotice } from '../components/PermissionNotice';
import { DEFAULT_REGION } from '../config/appConfig';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { useProfile } from '../hooks/useProfile';
import { useSupportPoints } from '../hooks/useSupportPoints';
import { geocodePointAddress } from '../services/geocodingService';
import { lookupCep, ViaCepError } from '../services/viaCepService';
import { colors } from '../theme/colors';
import { cardShadow, fontSize, radius, spacing } from '../theme/spacing';
import type { Coordinates } from '../types/location';
import type { RootStackParamList } from '../types/navigation';
import type {
  Amenity,
  PointAddress,
  PointLocationMode,
  PointType,
} from '../types/supportPoint';
import {
  amenityLabels,
  formatCep,
  formatStructuredAddress,
  pointTypeIconNames,
  pointTypeLabels,
  stripCep,
} from '../utils/formatters';
import { validatePointInput } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'PointForm'>;

const POINT_TYPES: readonly PointType[] = [
  'bebedouro',
  'sombra',
  'descanso',
  'parceiro',
];

const ALL_AMENITIES: readonly Amenity[] = [
  'agua_potavel',
  'banheiro',
  'banco',
  'tomada',
  'sombra_coberta',
  'ar_condicionado',
];

export function PointFormScreen({ route, navigation }: Props) {
  const initialCategory = route.params?.initialCategory ?? 'bebedouro';
  const editPointId = route.params?.editPointId;

  const { session, isAdmin } = useAuth();
  const { profile } = useProfile();
  const { points, requestPoint, updatePoint } = useSupportPoints();
  const {
    coordinates: gpsCoords,
    permission: locationPermission,
    requestPermission: requestLocationPermission,
    openSettings: openLocationSettings,
  } = useLocation({ watch: false });

  const editingPoint = useMemo(
    () =>
      editPointId ? points.find((item) => item.id === editPointId) : undefined,
    [editPointId, points],
  );

  const [type, setType] = useState<PointType>(
    editingPoint?.type ?? initialCategory,
  );
  const [name, setName] = useState(editingPoint?.name ?? '');
  const [description, setDescription] = useState(
    editingPoint?.description ?? '',
  );
  const [locationMode, setLocationMode] = useState<PointLocationMode>(
    editingPoint?.structuredAddress?.cep ? 'cep' : 'cep',
  );

  // Campos do modo GPS (endereço livre)
  const [freeAddress, setFreeAddress] = useState(editingPoint?.address ?? '');

  // Campos do modo Endereço por CEP (M8)
  const [cep, setCep] = useState(
    editingPoint?.structuredAddress?.cep
      ? formatCep(editingPoint.structuredAddress.cep)
      : '',
  );
  const [street, setStreet] = useState(
    editingPoint?.structuredAddress?.street ?? '',
  );
  const [streetNumber, setStreetNumber] = useState(
    editingPoint?.structuredAddress?.number ?? '',
  );
  const [complement, setComplement] = useState(
    editingPoint?.structuredAddress?.complement ?? '',
  );
  const [neighborhood, setNeighborhood] = useState(
    editingPoint?.structuredAddress?.neighborhood ?? '',
  );
  const [city, setCity] = useState(editingPoint?.structuredAddress?.city ?? '');
  const [stateUf, setStateUf] = useState(
    editingPoint?.structuredAddress?.state ?? '',
  );

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | undefined>(undefined);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(
    editingPoint
      ? { latitude: editingPoint.latitude, longitude: editingPoint.longitude }
      : null,
  );

  const [is24h, setIs24h] = useState(editingPoint?.is24h ?? false);
  const [opensAt, setOpensAt] = useState(editingPoint?.opensAt ?? '08:00');
  const [closesAt, setClosesAt] = useState(editingPoint?.closesAt ?? '18:00');
  const [amenities, setAmenities] = useState<Amenity[]>(
    editingPoint?.amenities ?? ['agua_potavel'],
  );
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    editingPoint?.photoUri,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Atualiza o título da barra superior se estiver em modo de edição administrativa
  useEffect(() => {
    if (editingPoint) {
      navigation.setOptions({ title: 'Editar ponto de apoio' });
    }
  }, [editingPoint, navigation]);

  // No modo GPS, assim que a coordenada chega, preenche o pino inicial se ainda vazio
  useEffect(() => {
    if (locationMode === 'gps' && gpsCoords && !selectedCoords && !editingPoint) {
      setSelectedCoords(gpsCoords);
    }
  }, [locationMode, gpsCoords, selectedCoords, editingPoint]);

  const handleToggleAmenity = useCallback((item: Amenity): void => {
    setAmenities((prev) =>
      prev.includes(item)
        ? prev.filter((existing) => existing !== item)
        : [...prev, item],
    );
  }, []);

  const handleUseMyLocationNow = useCallback(async (): Promise<void> => {
    setLocationMode('gps');
    if (locationPermission !== 'granted') {
      const next = await requestLocationPermission();
      if (next !== 'granted') {
        return;
      }
    }
    if (gpsCoords) {
      setSelectedCoords(gpsCoords);
      setGeocodeStatus('Posição capturada pelo GPS do aparelho.');
    }
  }, [locationPermission, requestLocationPermission, gpsCoords]);

  const runGeocodeForAddress = useCallback(
    async (addr: PointAddress): Promise<Coordinates | null> => {
      setGeocodingLoading(true);
      setGeocodeStatus(null);
      try {
        const result = await geocodePointAddress(addr);
        if (result) {
          setSelectedCoords(result.coordinates);
          setGeocodeStatus(result.precisionLabel);
          setErrors((prev) => {
            const next = { ...prev };
            delete next.coordinates;
            return next;
          });
          return result.coordinates;
        }
        setGeocodeStatus(
          'Não foi possível localizar o número automaticamente. Toque no mini-mapa abaixo para posicionar o pino.',
        );
        if (!selectedCoords) {
          setSelectedCoords({
            latitude: DEFAULT_REGION.latitude,
            longitude: DEFAULT_REGION.longitude,
          });
        }
        return null;
      } finally {
        setGeocodingLoading(false);
      }
    },
    [selectedCoords],
  );

  const handleLookupCep = useCallback(
    async (rawCep: string): Promise<void> => {
      const digits = stripCep(rawCep);
      if (digits.length !== 8) {
        return;
      }
      setCepLoading(true);
      setCepError(undefined);
      try {
        const resolved = await lookupCep(digits);
        setStreet(resolved.street || street);
        setNeighborhood(resolved.neighborhood || neighborhood);
        setCity(resolved.city);
        setStateUf(resolved.state);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.cep;
          delete next.city;
          if (resolved.street) {
            delete next.street;
          }
          return next;
        });

        // Geocodifica preliminarmente pelo CEP + rua para já posicionar o mini-mapa
        await runGeocodeForAddress({
          cep: resolved.cep,
          street: resolved.street || street,
          number: streetNumber,
          neighborhood: resolved.neighborhood,
          city: resolved.city,
          state: resolved.state,
        });
      } catch (err: unknown) {
        setCepError(
          err instanceof ViaCepError
            ? err.message
            : 'Não foi possível consultar o CEP agora.',
        );
      } finally {
        setCepLoading(false);
      }
    },
    [street, neighborhood, streetNumber, runGeocodeForAddress],
  );

  const handleCepChange = useCallback(
    (value: string): void => {
      const formatted = formatCep(value);
      setCep(formatted);
      const digits = stripCep(formatted);
      if (digits.length === 8) {
        void handleLookupCep(digits);
      } else {
        setCepError(undefined);
      }
    },
    [handleLookupCep],
  );

  const handleGeocodeButtonPress = useCallback(async (): Promise<void> => {
    if (!street.trim() || !city.trim()) {
      Alert.alert(
        'Informe o CEP',
        'Digite o CEP válido e o número do endereço antes de localizar no mapa.',
      );
      return;
    }
    await runGeocodeForAddress({
      cep,
      street,
      number: streetNumber,
      complement,
      neighborhood,
      city,
      state: stateUf,
    });
  }, [
    street,
    city,
    runGeocodeForAddress,
    cep,
    streetNumber,
    complement,
    neighborhood,
    stateUf,
  ]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!session || !profile) {
      navigation.replace('Login', {
        redirectTo: { target: 'PointForm', params: route.params },
      });
      return;
    }

    const structuredAddress: PointAddress | undefined =
      locationMode === 'cep'
        ? {
            cep: formatCep(cep),
            street: street.trim(),
            number: streetNumber.trim(),
            complement: complement.trim() || undefined,
            neighborhood: neighborhood.trim() || undefined,
            city: city.trim(),
            state: stateUf.trim().toUpperCase(),
          }
        : undefined;

    let coordsToSave = selectedCoords;
    if (
      locationMode === 'cep' &&
      !coordsToSave &&
      structuredAddress &&
      structuredAddress.street.length >= 3 &&
      structuredAddress.city
    ) {
      coordsToSave = await runGeocodeForAddress(structuredAddress);
    }

    const finalAddress =
      locationMode === 'cep' && structuredAddress
        ? formatStructuredAddress(structuredAddress)
        : freeAddress.trim();

    const input = {
      type,
      name,
      description,
      address: finalAddress,
      structuredAddress,
      latitude: coordsToSave?.latitude ?? null,
      longitude: coordsToSave?.longitude ?? null,
      opensAt,
      closesAt,
      is24h,
      amenities,
      photoUri,
    };

    const validation = validatePointInput(input, locationMode);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstMessage =
        Object.values(validation.errors)[0] ?? 'Confira os campos obrigatórios.';
      Alert.alert('Atenção', firstMessage);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      if (editingPoint && isAdmin) {
        await updatePoint(editingPoint.id, input, session.name);
        Alert.alert(
          'Ponto atualizado',
          'As alterações foram salvas e já estão visíveis no aplicativo.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        await requestPoint(input, profile);
        Alert.alert(
          'Pedido enviado para análise',
          'Seu ponto foi registrado com status "Em análise". Assim que o administrador aprovar, ele aparecerá no Início e no Mapa.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch {
      Alert.alert(
        'Atenção',
        'Não foi possível salvar os dados do ponto. Tente de novo.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    session,
    profile,
    navigation,
    route.params,
    locationMode,
    cep,
    street,
    streetNumber,
    complement,
    neighborhood,
    city,
    stateUf,
    selectedCoords,
    freeAddress,
    type,
    name,
    description,
    opensAt,
    closesAt,
    is24h,
    amenities,
    photoUri,
    runGeocodeForAddress,
    editingPoint,
    isAdmin,
    updatePoint,
    requestPoint,
  ]);

  if (!session) {
    return (
      <View style={styles.unauthContainer}>
        <EmptyState
          icon="user"
          title="Login necessário"
          message="Entre na sua conta para sugerir o cadastro de um ponto de apoio."
          actionLabel="Entrar na minha conta"
          onAction={() =>
            navigation.replace('Login', {
              redirectTo: { target: 'PointForm', params: route.params },
            })
          }
        />
      </View>
    );
  }

  const mapCenter: Coordinates = selectedCoords ??
    gpsCoords ?? {
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
    };

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
        <Text style={styles.sectionLabel}>Categoria do ponto *</Text>
        <View style={styles.chipsWrap}>
          {POINT_TYPES.map((item) => {
            const active = item === type;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setType(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppIcon
                  name={pointTypeIconNames[item]}
                  size={15}
                  color={active ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {pointTypeLabels[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FormField
          label="Nome do local *"
          placeholder="Ex.: Bebedouro da Praça da República"
          value={name}
          onChangeText={setName}
          error={errors.name}
          maxLength={80}
        />

        <FormField
          label="Descrição *"
          placeholder="Conte como chegar, onde fica a água/sombra e quem pode usar"
          multiline
          value={description}
          onChangeText={setDescription}
          error={errors.description}
          maxLength={300}
        />

        {/* Seletor de Modo de Localização (M8): Endereço por CEP vs. GPS */}
        <View style={styles.locationCard}>
          <Text style={styles.sectionLabel}>
            Como deseja informar a localização? *
          </Text>
          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: locationMode === 'cep' }}
              onPress={() => setLocationMode('cep')}
              style={[
                styles.segmentButton,
                locationMode === 'cep' && styles.segmentButtonActive,
              ]}
            >
              <AppIcon
                name="map-pin"
                size={15}
                color={
                  locationMode === 'cep' ? colors.textOnPrimary : colors.text
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  locationMode === 'cep' && styles.segmentTextActive,
                ]}
              >
                Informar endereço (CEP)
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: locationMode === 'gps' }}
              onPress={handleUseMyLocationNow}
              style={[
                styles.segmentButton,
                locationMode === 'gps' && styles.segmentButtonActive,
              ]}
            >
              <AppIcon
                name="navigation"
                size={15}
                color={
                  locationMode === 'gps' ? colors.textOnPrimary : colors.text
                }
              />
              <Text
                style={[
                  styles.segmentText,
                  locationMode === 'gps' && styles.segmentTextActive,
                ]}
              >
                Usar meu GPS
              </Text>
            </Pressable>
          </View>

          {locationMode === 'cep' ? (
            <View style={styles.cepFormBlock}>
              <FormField
                label="CEP *"
                placeholder="00000-000"
                keyboardType="number-pad"
                maxLength={9}
                value={cep}
                onChangeText={handleCepChange}
                error={cepError ?? errors.cep}
                hint="Ao completar os 8 dígitos, rua, bairro, cidade e UF são preenchidos pelo ViaCEP."
              />

              {cepLoading ? (
                <View style={styles.statusInline}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.statusInlineText}>
                    Buscando endereço no ViaCEP...
                  </Text>
                </View>
              ) : null}

              <FormField
                label="Rua / Logradouro *"
                placeholder="Preenchido pelo CEP (ou digite)"
                value={street}
                onChangeText={setStreet}
                error={errors.street}
                maxLength={100}
              />

              <View style={styles.rowFields}>
                <View style={styles.numberCol}>
                  <FormField
                    label="Número *"
                    placeholder="Ex.: 1374 ou S/N"
                    value={streetNumber}
                    onChangeText={setStreetNumber}
                    error={errors.number}
                    maxLength={20}
                  />
                </View>
                <View style={styles.complementCol}>
                  <FormField
                    label="Complemento (opcional)"
                    placeholder="Ex.: Portão 3 / Quiosque"
                    value={complement}
                    onChangeText={setComplement}
                    maxLength={50}
                  />
                </View>
              </View>

              <View style={styles.rowFields}>
                <View style={styles.flex}>
                  <FormField
                    label="Bairro"
                    placeholder="Bairro"
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    maxLength={60}
                  />
                </View>
                <View style={styles.flex}>
                  <FormField
                    label="Cidade / UF *"
                    placeholder="São Paulo / SP"
                    value={
                      city && stateUf ? `${city}/${stateUf}` : city
                    }
                    editable={false}
                    error={errors.city}
                  />
                </View>
              </View>

              <CustomButton
                title="Localizar endereço no mapa"
                icon="search"
                variant="outline"
                compact
                loading={geocodingLoading}
                onPress={handleGeocodeButtonPress}
              />
            </View>
          ) : (
            <View style={styles.gpsFormBlock}>
              {locationPermission !== 'granted' ? (
                <PermissionNotice
                  title="Permissão de localização"
                  description="Permita o GPS para capturar sua posição atual automaticamente, ou mude para 'Informar endereço (CEP)' acima."
                  permission={locationPermission}
                  onRequestPermission={requestLocationPermission}
                  onOpenSettings={openLocationSettings}
                />
              ) : null}

              <FormField
                label="Endereço ou ponto de referência *"
                placeholder="Ex.: Av. Paulista, 1374 — próximo à estação Trianon-Masp"
                value={freeAddress}
                onChangeText={setFreeAddress}
                error={errors.address}
                maxLength={140}
              />

              <CustomButton
                title="Capturar minha posição atual do GPS"
                icon="navigation"
                variant="outline"
                compact
                onPress={handleUseMyLocationNow}
              />
            </View>
          )}

          {/* Mini-mapa de confirmação e ajuste fino (M8) */}
          <View style={styles.miniMapSection}>
            <Text style={styles.miniMapTitle}>
              Confirme a posição no mini-mapa *
            </Text>
            <Text style={styles.miniMapHint}>
              Toque no mapa ou arraste o marcador verde para ajustar o ponto
              exato.
            </Text>

            {geocodeStatus ? (
              <View style={styles.geocodeNotice}>
                <AppIcon name="map-pin" size={14} color={colors.primaryDark} />
                <Text style={styles.geocodeNoticeText}>{geocodeStatus}</Text>
              </View>
            ) : null}

            <View style={styles.miniMapWrapper}>
              <InteractiveMapView
                center={mapCenter}
                zoom={16}
                pickerPin={selectedCoords}
                userLocation={
                  locationPermission === 'granted' ? gpsCoords : null
                }
                onPickCoordinates={(coords) => {
                  setSelectedCoords(coords);
                  setGeocodeStatus('Posição ajustada manualmente no mapa.');
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.coordinates;
                    return next;
                  });
                }}
                style={styles.miniMap}
              />
            </View>

            {selectedCoords ? (
              <Text style={styles.coordsCaption}>
                Coordenadas selecionadas: {selectedCoords.latitude.toFixed(5)},{' '}
                {selectedCoords.longitude.toFixed(5)}
              </Text>
            ) : null}
            {errors.coordinates ? (
              <Text style={styles.error}>{errors.coordinates}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Funciona 24 horas</Text>
          <Switch
            accessibilityLabel="Funciona 24 horas"
            value={is24h}
            onValueChange={setIs24h}
            trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
            thumbColor={is24h ? colors.primary : colors.surface}
          />
        </View>

        {!is24h ? (
          <View style={styles.hoursRow}>
            <View style={styles.hourField}>
              <FormField
                label="Abre às *"
                placeholder="08:00"
                value={opensAt}
                onChangeText={setOpensAt}
                error={errors.opensAt}
                maxLength={5}
              />
            </View>
            <View style={styles.hourField}>
              <FormField
                label="Fecha às *"
                placeholder="18:00"
                value={closesAt}
                onChangeText={setClosesAt}
                error={errors.closesAt}
                maxLength={5}
              />
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Estrutura disponível</Text>
        <View style={styles.chipsWrap}>
          {ALL_AMENITIES.map((item) => {
            const active = amenities.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => handleToggleAmenity(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                {active ? (
                  <AppIcon
                    name="check"
                    size={14}
                    color={colors.textOnPrimary}
                  />
                ) : null}
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {amenityLabels[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <CameraCapture
          label="Foto do local (opcional)"
          photoUri={photoUri}
          onChangePhoto={setPhotoUri}
        />

        <CustomButton
          title={
            editingPoint && isAdmin
              ? 'Salvar alterações do ponto'
              : 'Enviar pedido de cadastro'
          }
          icon="check"
          onPress={handleSubmit}
          loading={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  unauthContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
    ...cardShadow,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.text,
  },
  segmentTextActive: {
    color: colors.textOnPrimary,
  },
  cepFormBlock: {
    gap: 2,
  },
  gpsFormBlock: {
    gap: spacing.xs,
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  statusInlineText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numberCol: {
    flex: 0.9,
  },
  complementCol: {
    flex: 1.1,
  },
  miniMapSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  miniMapTitle: {
    fontSize: fontSize.small,
    fontWeight: '700',
    color: colors.text,
  },
  miniMapHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  geocodeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  geocodeNoticeText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  miniMapWrapper: {
    height: 210,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  miniMap: {
    flex: 1,
  },
  coordsCaption: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hourField: {
    flex: 1,
  },
  error: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.danger,
  },
});
