/**
 * Perfil local e modo avaliador no AsyncStorage.
 * Chaves: @citizentech:v1:profile e @citizentech:v1:reviewer_mode.
 */
import type { CitizenProfile, ProfileInput } from '../types/profile';
import { generateId } from '../utils/generateId';
import { isCitizenProfile } from '../utils/validation';
import { readStoredJson, removeStoredKey, STORAGE_PREFIX, writeStoredJson } from './cacheStorage';

const PROFILE_KEY = `${STORAGE_PREFIX}profile`;
const REVIEWER_MODE_KEY = `${STORAGE_PREFIX}reviewer_mode`;

function isProfileOrNull(value: unknown): value is CitizenProfile | null {
  return value === null || isCitizenProfile(value);
}

function isBooleanValue(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Lê o perfil salvo (ou null se ausente/corrompido). */
export async function getProfile(): Promise<CitizenProfile | null> {
  return readStoredJson(PROFILE_KEY, isProfileOrNull, null);
}

/**
 * Cria ou atualiza o perfil. Mantém id e createdAt quando já existe
 * (editar o nome não muda a posse dos pontos cadastrados).
 */
export async function saveProfile(input: ProfileInput): Promise<CitizenProfile> {
  const current = await getProfile();
  const contact = input.contact?.trim();
  const profile: CitizenProfile = {
    id: current?.id ?? generateId('usr'),
    name: input.name.trim(),
    contact: contact && contact.length > 0 ? contact : undefined,
    createdAt: current?.createdAt ?? new Date().toISOString(),
  };
  await writeStoredJson(PROFILE_KEY, profile);
  return profile;
}

/** Remove o perfil do aparelho ("Sair deste perfil"). */
export async function clearProfile(): Promise<void> {
  await removeStoredKey(PROFILE_KEY);
}

/** Lê o modo avaliador (padrão: desligado). */
export async function getReviewerMode(): Promise<boolean> {
  return readStoredJson(REVIEWER_MODE_KEY, isBooleanValue, false);
}

/** Liga ou desliga o modo avaliador. */
export async function setReviewerMode(value: boolean): Promise<void> {
  await writeStoredJson(REVIEWER_MODE_KEY, value);
}
