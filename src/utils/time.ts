/**
 * Regras de horário dos pontos de apoio.
 */
import type { SupportPoint } from '../types/supportPoint';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Verifica se o texto está no formato HH:mm válido (00:00 a 23:59). */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Converte "HH:mm" em minutos desde a meia-noite (ou null se inválido). */
export function timeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

type OpeningHours = Pick<SupportPoint, 'is24h' | 'opensAt' | 'closesAt'>;

/**
 * Indica se o ponto está aberto no instante informado.
 * Trata horários que viram a meia-noite (ex.: 22:00 às 06:00).
 */
export function isOpenNow(point: OpeningHours, now: Date): boolean {
  if (point.is24h) {
    return true;
  }
  const opens = timeToMinutes(point.opensAt);
  const closes = timeToMinutes(point.closesAt);
  if (opens === null || closes === null) {
    return false;
  }
  const current = now.getHours() * 60 + now.getMinutes();

  if (opens === closes) {
    // Mesmo horário de abertura e fechamento: tratamos como aberto o dia todo.
    return true;
  }
  if (opens < closes) {
    return current >= opens && current < closes;
  }
  // Vira a meia-noite: aberto depois da abertura OU antes do fechamento.
  return current >= opens || current < closes;
}
