/**
 * Envoltório do expo-location com estado formal de permissão.
 * Telas e hooks nunca importam expo-location diretamente.
 */
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import type { Coordinates, LocationPermissionState } from '../types/location';

/** Converte a resposta do expo-location no nosso estado de permissão. */
function toPermissionState(response: Location.LocationPermissionResponse): LocationPermissionState {
  if (response.granted) {
    return 'granted';
  }
  if (response.status === Location.PermissionStatus.UNDETERMINED) {
    return 'undetermined';
  }
  // Negada: se não pode perguntar de novo, só pelas configurações (bloqueada).
  return response.canAskAgain ? 'denied' : 'blocked';
}

/** Lê o estado atual sem abrir o diálogo do sistema. */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  const response = await Location.getForegroundPermissionsAsync();
  const state = toPermissionState(response);
  if (state === 'granted' && !servicesEnabled) {
    return 'services_disabled';
  }
  return state;
}

/** Pede a permissão (abre o diálogo quando o sistema permitir). */
export async function requestLocationPermission(): Promise<LocationPermissionState> {
  const response = await Location.requestForegroundPermissionsAsync();
  const state = toPermissionState(response);
  if (state !== 'granted') {
    return state;
  }
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  return servicesEnabled ? 'granted' : 'services_disabled';
}

/** Posição atual com precisão balanceada (economiza bateria). */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/** Abre as configurações do app (caso de permissão bloqueada). */
export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

/**
 * Acompanha a posição e devolve a função que remove a assinatura.
 * Deve ser chamada no useEffect e a remoção feita no retorno do efeito.
 */
export async function watchCoordinates(
  callback: (coordinates: Coordinates) => void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 100,
      timeInterval: 30000,
    },
    (position) => {
      callback({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    },
  );
  return () => subscription.remove();
}
