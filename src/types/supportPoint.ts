/**
 * Tipos dos pontos de apoio e do formulário de solicitação/edição.
 */

/** Categoria do ponto de apoio. */
export type PointType = 'bebedouro' | 'sombra' | 'descanso' | 'parceiro';

/** Situação do pedido de ponto: pendente, aprovado ou rejeitado. */
export type PointStatus = 'pending' | 'approved' | 'rejected';

/** Comodidades oferecidas pelo local. */
export type Amenity =
  | 'agua_potavel'
  | 'banheiro'
  | 'banco'
  | 'tomada'
  | 'sombra_coberta'
  | 'ar_condicionado';

/** Endereço postal estruturado obtido por CEP (ViaCEP) ou preenchimento manual. */
export interface PointAddress {
  cep?: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

/** Modo de escolha da localização no formulário de ponto. */
export type PointLocationMode = 'gps' | 'cep';

/** Ponto de apoio completo salvo no armazenamento local. */
export interface SupportPoint {
  id: string;
  type: PointType;
  name: string;
  description: string;
  address: string;
  structuredAddress?: PointAddress;
  latitude: number;
  longitude: number;
  opensAt: string;
  closesAt: string;
  is24h: boolean;
  amenities: Amenity[];
  photoUri?: string;
  status: PointStatus;
  /** Permite ao dono ou admin desativar temporariamente um ponto aprovado. */
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdByContact?: string;
  createdAt: string;
  /** Metadados de auditoria administrativa (M7). */
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

/** Dados enviados pelo formulário ao pedir ou editar um ponto. */
export interface NewSupportPointInput {
  type: PointType;
  name: string;
  description: string;
  address: string;
  structuredAddress?: PointAddress;
  latitude: number | null;
  longitude: number | null;
  opensAt: string;
  closesAt: string;
  is24h: boolean;
  amenities: Amenity[];
  photoUri?: string;
}
