/**
 * Pontos de apoio: bebedouros, áreas de descanso, sombra e outros.
 */

export type SupportPointType = 'bebedouro' | 'descanso' | 'sombra' | 'outro';

export type SupportPointStatus = 'em_analise' | 'aprovado' | 'rejeitado' | 'desativado';

export interface SupportPoint {
  id: string;
  type: SupportPointType;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  is24h: boolean;
  /** Horário de abertura no formato "HH:mm". */
  opensAt: string;
  /** Horário de fechamento no formato "HH:mm". */
  closesAt: string;
  hasShade: boolean;
  hasColdWater: boolean;
  hasSeating: boolean;
  photoUri?: string;
  status: SupportPointStatus;
  rejectionReason?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

/** Campos preenchidos pelo formulário de novo ponto. */
export interface NewSupportPointInput {
  type: SupportPointType;
  name: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  is24h: boolean;
  opensAt: string;
  closesAt: string;
  hasShade: boolean;
  hasColdWater: boolean;
  hasSeating: boolean;
  photoUri?: string;
}
