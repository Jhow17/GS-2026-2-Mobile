/**
 * Serviço de Geocodificação em Cascata Híbrida (M8 - Opção 5A aprovada):
 * 1. Tenta Location.geocodeAsync (expo-location) se a permissão de localização estiver concedida;
 * 2. Tenta OpenStreetMap Nominatim (HTTP gratuito com User-Agent identificado);
 * 3. Tenta BrasilAPI CEP v2 (retorna coordenadas para o CEP quando o logradouro exato falha).
 */
import axios from 'axios';
import * as Location from 'expo-location';

import type { Coordinates } from '../types/location';
import type { PointAddress } from '../types/supportPoint';
import { stripCep } from '../utils/formatters';
import { isRecord, isValidCoordinates } from '../utils/validation';

export interface GeocodeResult {
  coordinates: Coordinates;
  source: 'device' | 'nominatim' | 'brasilapi';
  precisionLabel: string;
}

function isNominatimArray(
  value: unknown,
): value is Array<{ lat: string; lon: string }> {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  const first: unknown = value[0];
  return (
    isRecord(first) &&
    typeof first.lat === 'string' &&
    typeof first.lon === 'string'
  );
}

function isBrasilApiCepV2(
  value: unknown,
): value is {
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
} {
  return isRecord(value);
}

/**
 * Converte um endereço estruturado (CEP, rua, número, bairro, cidade, UF) em coordenadas.
 */
export async function geocodePointAddress(
  address: PointAddress,
): Promise<GeocodeResult | null> {
  const street = address.street.trim();
  const number = (address.number ?? '').trim();
  const neighborhood = (address.neighborhood ?? '').trim();
  const city = (address.city ?? '').trim();
  const state = (address.state ?? '').trim();
  const cepDigits = stripCep(address.cep ?? '');

  const fullQueryParts = [
    number && number.toUpperCase() !== 'S/N' ? `${street}, ${number}` : street,
    neighborhood,
    city && state ? `${city} - ${state}` : city,
    cepDigits,
    'Brasil',
  ].filter((part) => part.length > 0);
  const fullQuery = fullQueryParts.join(', ');

  // 1. Tenta o geocodificador nativo (expo-location) se a permissão já estiver concedida
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.granted && fullQuery.length >= 5) {
      const results = await Location.geocodeAsync(fullQuery);
      const first = results[0];
      if (first && isValidCoordinates(first.latitude, first.longitude)) {
        return {
          coordinates: { latitude: first.latitude, longitude: first.longitude },
          source: 'device',
          precisionLabel: 'Endereço localizado com precisão',
        };
      }
    }
  } catch {
    // Segue para o próximo provedor na cascata
  }

  // 2. Tenta OpenStreetMap Nominatim (com busca completa e fallback para rua + cidade)
  const queriesToTry = [
    fullQuery,
    [street, city, state, 'Brasil'].filter((item) => item.length > 0).join(', '),
  ];

  for (const query of queriesToTry) {
    if (query.length < 4) {
      continue;
    }
    try {
      const response = await axios.get<unknown>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: query,
            format: 'json',
            limit: 1,
            countrycodes: 'br',
          },
          headers: {
            'User-Agent': 'CitizenTech-FIAP-Mobile/1.0',
            Accept: 'application/json',
          },
          timeout: 8000,
        },
      );
      if (isNominatimArray(response.data)) {
        const first = response.data[0];
        if (first) {
          const lat = Number(first.lat);
          const lon = Number(first.lon);
          if (isValidCoordinates(lat, lon)) {
            return {
              coordinates: { latitude: lat, longitude: lon },
              source: 'nominatim',
              precisionLabel: 'Localizado no mapa pelo endereço',
            };
          }
        }
      }
    } catch {
      // Segue para a próxima tentativa
    }
  }

  // 3. Fallback: BrasilAPI CEP v2 (traz coordenadas geográficas do CEP)
  if (cepDigits.length === 8) {
    try {
      const response = await axios.get<unknown>(
        `https://brasilapi.com.br/api/cep/v2/${cepDigits}`,
        { timeout: 8000 },
      );
      if (isBrasilApiCepV2(response.data)) {
        const coords = response.data.location?.coordinates;
        const lat = Number(coords?.latitude);
        const lon = Number(coords?.longitude);
        if (isValidCoordinates(lat, lon)) {
          return {
            coordinates: { latitude: lat, longitude: lon },
            source: 'brasilapi',
            precisionLabel: 'Posicionado na região do CEP (ajuste o pino se necessário)',
          };
        }
      }
    } catch {
      // Sem coordenadas automáticas
    }
  }

  return null;
}
