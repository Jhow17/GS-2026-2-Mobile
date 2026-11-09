/**
 * Validação de formulários e guardas de tipo para dados externos
 * (AsyncStorage, cache e API). Nada entra no domínio sem passar por aqui.
 */
import { REQUIRE_PHOTO_FOR_NEW_POINT } from '../config/appConfig';
import type { CitizenProfile, ProfileInput } from '../types/profile';
import type { FountainReport, NewReportInput, ReportStatus } from '../types/report';
import type {
  NewSupportPointInput,
  SupportPoint,
  SupportPointStatus,
  SupportPointType,
} from '../types/supportPoint';
import type {
  AirQuality,
  AirQualityIndex,
  ForecastSlot,
  WeatherReading,
  WeatherSource,
} from '../types/weather';
import { isValidTime } from './time';

/** Resultado padrão das validações de formulário. */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Guardas básicas
// ---------------------------------------------------------------------------

/** Verifica se o valor é um objeto simples (não nulo e não array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

const POINT_TYPES: readonly SupportPointType[] = ['bebedouro', 'descanso', 'sombra', 'outro'];
const POINT_STATUSES: readonly SupportPointStatus[] = [
  'em_analise',
  'aprovado',
  'rejeitado',
  'desativado',
];
const REPORT_STATUSES: readonly ReportStatus[] = ['aberto', 'resolvido'];
const WEATHER_SOURCES: readonly WeatherSource[] = ['openweather', 'mock'];

export function isSupportPointType(value: unknown): value is SupportPointType {
  return POINT_TYPES.some((item) => item === value);
}

export function isSupportPointStatus(value: unknown): value is SupportPointStatus {
  return POINT_STATUSES.some((item) => item === value);
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return REPORT_STATUSES.some((item) => item === value);
}

export function isAirQualityIndex(value: unknown): value is AirQualityIndex {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isWeatherSource(value: unknown): value is WeatherSource {
  return WEATHER_SOURCES.some((item) => item === value);
}

export function isValidLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

// ---------------------------------------------------------------------------
// Guardas de domínio (leitura do AsyncStorage e do cache)
// ---------------------------------------------------------------------------

export function isSupportPoint(value: unknown): value is SupportPoint {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    isSupportPointType(value.type) &&
    isString(value.name) &&
    isString(value.description) &&
    isValidLatitude(value.latitude) &&
    isValidLongitude(value.longitude) &&
    isBoolean(value.is24h) &&
    isString(value.opensAt) &&
    isString(value.closesAt) &&
    isBoolean(value.hasShade) &&
    isBoolean(value.hasColdWater) &&
    isBoolean(value.hasSeating) &&
    isOptionalString(value.photoUri) &&
    isSupportPointStatus(value.status) &&
    isOptionalString(value.rejectionReason) &&
    isString(value.ownerId) &&
    isString(value.ownerName) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

export function isCitizenProfile(value: unknown): value is CitizenProfile {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    isString(value.name) &&
    isOptionalString(value.contact) &&
    isString(value.createdAt)
  );
}

export function isFountainReport(value: unknown): value is FountainReport {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    isString(value.pointId) &&
    isString(value.description) &&
    isOptionalString(value.photoUri) &&
    isString(value.authorId) &&
    isString(value.authorName) &&
    isReportStatus(value.status) &&
    isString(value.createdAt)
  );
}

export function isWeatherReading(value: unknown): value is WeatherReading {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.id) &&
    isString(value.name) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    isFiniteNumber(value.temperatureC) &&
    isFiniteNumber(value.feelsLikeC) &&
    isFiniteNumber(value.humidity) &&
    isFiniteNumber(value.windSpeedMs) &&
    isString(value.description) &&
    isString(value.iconCode) &&
    isString(value.readAt) &&
    isWeatherSource(value.source)
  );
}

export function isAirQuality(value: unknown): value is AirQuality {
  return isRecord(value) && isAirQualityIndex(value.index) && isFiniteNumber(value.pm25);
}

export function isForecastSlot(value: unknown): value is ForecastSlot {
  return (
    isRecord(value) &&
    isString(value.at) &&
    isFiniteNumber(value.temperatureC) &&
    isFiniteNumber(value.humidity)
  );
}

export function isForecastSlotList(value: unknown): value is ForecastSlot[] {
  return Array.isArray(value) && value.every(isForecastSlot);
}

/** Cria uma guarda para listas a partir da guarda do item. */
export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

// ---------------------------------------------------------------------------
// Validação de formulários
// ---------------------------------------------------------------------------

function validateLength(
  value: string,
  min: number,
  max: number,
  field: string,
  errors: Record<string, string>,
  label: string,
): void {
  const length = value.trim().length;
  if (length < min || length > max) {
    errors[field] = `${label} deve ter de ${min} a ${max} caracteres.`;
  }
}

/** Valida o formulário de novo ponto de apoio. */
export function validatePointInput(input: NewSupportPointInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isSupportPointType(input.type)) {
    errors.type = 'Escolha o tipo do ponto.';
  }
  validateLength(input.name, 3, 60, 'name', errors, 'O nome');
  validateLength(input.description, 10, 280, 'description', errors, 'A descrição');

  if (!input.is24h) {
    if (!isValidTime(input.opensAt)) {
      errors.opensAt = 'Use o formato HH:mm (ex.: 08:00).';
    }
    if (!isValidTime(input.closesAt)) {
      errors.closesAt = 'Use o formato HH:mm (ex.: 18:00).';
    }
  }

  if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
    errors.location = 'Informe uma localização válida.';
  }

  if (REQUIRE_PHOTO_FOR_NEW_POINT && (!input.photoUri || input.photoUri.trim().length === 0)) {
    errors.photo = 'Tire uma foto do local.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Valida o formulário de perfil. */
export function validateProfileInput(input: ProfileInput): ValidationResult {
  const errors: Record<string, string> = {};
  validateLength(input.name, 3, 60, 'name', errors, 'O nome');
  if (input.contact !== undefined && input.contact.trim().length > 80) {
    errors.contact = 'O contato deve ter no máximo 80 caracteres.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Valida o formulário de relato de bebedouro avariado. */
export function validateReportInput(input: NewReportInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.pointId.trim().length === 0) {
    errors.pointId = 'Escolha o bebedouro.';
  }
  validateLength(input.description, 10, 280, 'description', errors, 'A descrição');
  return { valid: Object.keys(errors).length === 0, errors };
}
