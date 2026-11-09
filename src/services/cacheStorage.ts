/**
 * Cache genérico e tipado no AsyncStorage, mais os utilitários de leitura
 * segura (JSON.parse protegido + guarda de tipo) usados pelos demais *Storage.
 *
 * Formato do cache: @citizentech:v1:cache:<nome>:<lat>:<lon> -> { savedAt, data }
 * com coordenadas arredondadas a 2 casas (~1 km), para reaproveitar leituras próximas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isRecord } from '../utils/validation';

/** Prefixo versionado de todas as chaves do app. */
export const STORAGE_PREFIX = '@citizentech:v1:';

/** Valor de cache devolvido com a data em que foi salvo. */
export interface CachedValue<T> {
  savedAt: number;
  data: T;
}

/** Guarda de tipo recebida por quem consulta o cache. */
export type TypeGuard<T> = (value: unknown) => value is T;

// ---------------------------------------------------------------------------
// Utilitários de leitura e escrita segura
// ---------------------------------------------------------------------------

/**
 * Lê uma chave, faz JSON.parse em try/catch e valida com a guarda.
 * Ausente ou corrompido: devolve o valor padrão sem quebrar o app.
 */
export async function readStoredJson<T>(
  key: string,
  isValid: TypeGuard<T>,
  fallback: T,
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Indica se a chave já existe (usado para semear dados na primeira execução). */
export async function hasStoredKey(key: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw !== null;
  } catch {
    return false;
  }
}

/** Grava qualquer valor serializável. */
export async function writeStoredJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Remove uma chave. */
export async function removeStoredKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ---------------------------------------------------------------------------
// Cache com tempo de vida
// ---------------------------------------------------------------------------

/** Monta a chave de cache com coordenadas arredondadas a 2 casas. */
export function buildCacheKey(name: string, latitude: number, longitude: number): string {
  return `${STORAGE_PREFIX}cache:${name}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

/** Lê a entrada bruta do cache e valida o formato { savedAt, data }. */
async function readEntry<T>(key: string, isValid: TypeGuard<T>): Promise<CachedValue<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.savedAt !== 'number') {
      return null;
    }
    const data: unknown = parsed.data;
    if (!isValid(data)) {
      return null;
    }
    return { savedAt: parsed.savedAt, data };
  } catch {
    return null;
  }
}

/** Devolve o dado somente se ainda estiver dentro do tempo de vida. */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  isValid: TypeGuard<T>,
): Promise<T | null> {
  const entry = await readEntry(key, isValid);
  if (!entry) {
    return null;
  }
  const age = Date.now() - entry.savedAt;
  return age <= ttlMs ? entry.data : null;
}

/** Devolve o dado guardado mesmo vencido (fallback quando a rede falha). */
export async function getStale<T>(
  key: string,
  isValid: TypeGuard<T>,
): Promise<CachedValue<T> | null> {
  return readEntry(key, isValid);
}

/** Salva o dado com o horário atual. Falha de escrita não interrompe o app. */
export async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CachedValue<T> = { savedAt: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache é opcional: se não conseguir gravar, seguimos sem ele.
  }
}
