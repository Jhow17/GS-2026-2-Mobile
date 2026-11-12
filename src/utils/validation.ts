/**
 * Guardas de tipo e validação dos formulários (clima, perfil, autenticação,
 * novo/edição de ponto com GPS ou CEP, e relato de problema).
 */
import type { LoginInput, RegisterInput } from '../types/auth';
import type { CitizenProfile, ProfileInput } from '../types/profile';
import type { NewReportInput } from '../types/report';
import type { NewSupportPointInput, PointLocationMode } from '../types/supportPoint';
import type {
  AirQuality,
  AirQualityIndex,
  ForecastSlot,
  WeatherReading,
} from '../types/weather';
import { stripCep } from './formatters';
import { isValidTime } from './time';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Guarda: verifica se o valor é um objeto comum (não nulo e não array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Verifica se latitude e longitude são números finitos dentro dos limites da Terra. */
export function isValidCoordinates(
  latitude: unknown,
  longitude: unknown,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Guarda de tipo para CitizenProfile. */
export function isCitizenProfile(value: unknown): value is CitizenProfile {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.contact === undefined || typeof value.contact === 'string')
  );
}

/** Guarda de tipo para AirQualityIndex (1 a 5). */
export function isAirQualityIndex(value: unknown): value is AirQualityIndex {
  return (
    value === 1 || value === 2 || value === 3 || value === 4 || value === 5
  );
}

/** Guarda de tipo para AirQuality. */
export function isAirQuality(value: unknown): value is AirQuality {
  return (
    isRecord(value) &&
    isAirQualityIndex(value.index) &&
    typeof value.pm25 === 'number' &&
    Number.isFinite(value.pm25)
  );
}

/** Guarda de tipo para ForecastSlot. */
export function isForecastSlot(value: unknown): value is ForecastSlot {
  return (
    isRecord(value) &&
    typeof value.at === 'string' &&
    typeof value.temperatureC === 'number' &&
    Number.isFinite(value.temperatureC) &&
    typeof value.humidity === 'number' &&
    Number.isFinite(value.humidity)
  );
}

/** Guarda de tipo para lista de ForecastSlot. */
export function isForecastSlotList(value: unknown): value is ForecastSlot[] {
  return Array.isArray(value) && value.every(isForecastSlot);
}

/** Guarda de tipo para WeatherReading. */
export function isWeatherReading(value: unknown): value is WeatherReading {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isValidCoordinates(value.latitude, value.longitude) &&
    typeof value.temperatureC === 'number' &&
    Number.isFinite(value.temperatureC) &&
    typeof value.feelsLikeC === 'number' &&
    Number.isFinite(value.feelsLikeC) &&
    typeof value.humidity === 'number' &&
    Number.isFinite(value.humidity) &&
    typeof value.windSpeedMs === 'number' &&
    Number.isFinite(value.windSpeedMs) &&
    typeof value.description === 'string' &&
    typeof value.iconCode === 'string' &&
    typeof value.readAt === 'string' &&
    (value.source === 'openweather' || value.source === 'mock')
  );
}

/** Valida CEP brasileiro (8 dígitos numéricos). */
export function isValidCep(cep: string): boolean {
  return stripCep(cep).length === 8;
}

/** Valida os campos do perfil local (mantido para compatibilidade). */
export function validateProfileInput(input: ProfileInput): ValidationResult {
  const errors: Record<string, string> = {};
  const name = input.name.trim();

  if (name.length < 2) {
    errors.name = 'Informe seu nome ou apelido (mínimo 2 letras).';
  } else if (name.length > 60) {
    errors.name = 'Use no máximo 60 caracteres no nome.';
  }

  if (input.contact && input.contact.trim().length > 80) {
    errors.contact = 'Use no máximo 80 caracteres no contato.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Valida os campos da tela de Login (M5). */
export function validateLoginInput(input: LoginInput): ValidationResult {
  const errors: Record<string, string> = {};
  const email = input.email.trim();

  if (!email) {
    errors.email = 'Informe seu e-mail.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Informe um e-mail válido.';
  }

  if (!input.password || input.password.length < 4) {
    errors.password = 'Informe sua senha.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Valida os campos da tela de Cadastro com CEP validado no ViaCEP (M5). */
export function validateRegisterInput(
  input: RegisterInput,
  cepResolved: boolean,
): ValidationResult {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const email = input.email.trim();

  if (name.length < 2) {
    errors.name = 'Informe seu nome completo ou apelido (mínimo 2 letras).';
  } else if (name.length > 60) {
    errors.name = 'Use no máximo 60 caracteres no nome.';
  }

  if (!email) {
    errors.email = 'Informe seu e-mail.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Informe um e-mail válido (ex.: voce@email.com).';
  }

  if (!isValidCep(input.cep)) {
    errors.cep = 'Informe um CEP válido no formato 00000-000.';
  } else if (!cepResolved) {
    errors.cep = 'Consulte um CEP existente antes de concluir o cadastro.';
  }

  if (!input.password || input.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'A confirmação de senha não confere.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Valida o formulário de novo ponto ou edição de ponto de apoio (M8). */
export function validatePointInput(
  input: NewSupportPointInput,
  locationMode: PointLocationMode = 'gps',
): ValidationResult {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const description = input.description.trim();
  const address = input.address.trim();

  if (name.length < 3) {
    errors.name = 'Informe o nome do local (mínimo 3 letras).';
  } else if (name.length > 80) {
    errors.name = 'Use no máximo 80 caracteres no nome.';
  }

  if (locationMode === 'cep') {
    const struct = input.structuredAddress;
    if (!struct?.cep || !isValidCep(struct.cep)) {
      errors.cep = 'Informe um CEP válido com 8 dígitos.';
    }
    if (!struct?.street || struct.street.trim().length < 3) {
      errors.street = 'Informe o logradouro (rua ou avenida).';
    }
    if (!struct?.number || struct.number.trim().length < 1) {
      errors.number = 'Informe o número do local (ou digite S/N).';
    }
    if (!struct?.city || struct.city.trim().length < 2) {
      errors.city = 'Consulte o CEP para preencher a cidade.';
    }
  } else {
    if (address.length < 5) {
      errors.address = 'Informe o endereço ou ponto de referência.';
    }
  }

  if (description.length < 10) {
    errors.description = 'Descreva o ponto (mínimo 10 caracteres).';
  }

  if (!isValidCoordinates(input.latitude, input.longitude)) {
    errors.coordinates =
      locationMode === 'cep'
        ? 'Clique em "Localizar endereço no mapa" ou toque no mapa para marcar a posição.'
        : 'Defina a localização no mapa ou aguarde o GPS.';
  }

  if (!input.is24h) {
    if (!isValidTime(input.opensAt)) {
      errors.opensAt = 'Use o formato HH:mm (ex.: 08:00).';
    }
    if (!isValidTime(input.closesAt)) {
      errors.closesAt = 'Use o formato HH:mm (ex.: 18:00).';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Valida o formulário de relato de problema em um ponto. */
export function validateReportInput(input: NewReportInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.pointId.trim()) {
    errors.pointId = 'Escolha o ponto de apoio com problema.';
  }

  if (input.description.trim().length < 10) {
    errors.description = 'Explique o defeito encontrado (mínimo 10 caracteres).';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
