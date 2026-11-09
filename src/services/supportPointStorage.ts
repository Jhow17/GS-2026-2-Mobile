/**
 * Pontos de apoio no AsyncStorage (@citizentech:v1:support_points).
 * Toda escrita lê a lista, copia com spread e regrava a lista inteira.
 * As regras de negócio de status (dono x avaliador) também ficam aqui.
 */
import type { CitizenProfile } from '../types/profile';
import type {
  NewSupportPointInput,
  SupportPoint,
  SupportPointStatus,
} from '../types/supportPoint';
import { generateId } from '../utils/generateId';
import { isArrayOf, isSupportPoint, validatePointInput } from '../utils/validation';
import { getReviewerMode } from './profileStorage';
import { hasStoredKey, readStoredJson, STORAGE_PREFIX, writeStoredJson } from './cacheStorage';

const POINTS_KEY = `${STORAGE_PREFIX}support_points`;

/** Resultado da busca de um ponto para o detalhe público. */
export type PublicPointLookup =
  | { kind: 'ok'; point: SupportPoint }
  | { kind: 'not_found' }
  | { kind: 'unavailable'; status: Exclude<SupportPointStatus, 'aprovado'> };

function isPointList(value: unknown): value is SupportPoint[] {
  return isArrayOf(value, isSupportPoint);
}

/** Pontos de exemplo criados na primeira execução (PLACEHOLDERS em São Paulo). */
function buildSeedPoints(): SupportPoint[] {
  const now = new Date().toISOString();
  const base = {
    status: 'aprovado' as const,
    ownerId: 'seed',
    ownerName: 'Equipe CitizenTech',
    createdAt: now,
    updatedAt: now,
  };
  return [
    {
      ...base,
      id: 'seed_1',
      type: 'bebedouro',
      name: 'Bebedouro da Praça da Sé',
      description: 'Bebedouro público ao lado da catedral, perto do ponto de táxi.',
      latitude: -23.5503,
      longitude: -46.6340,
      is24h: true,
      opensAt: '00:00',
      closesAt: '23:59',
      hasShade: false,
      hasColdWater: true,
      hasSeating: false,
    },
    {
      ...base,
      id: 'seed_2',
      type: 'descanso',
      name: 'Ponto de apoio Paulista',
      description: 'Espaço coberto com tomadas e bancos para entregadores fazerem pausas.',
      latitude: -23.5618,
      longitude: -46.6565,
      is24h: false,
      opensAt: '08:00',
      closesAt: '22:00',
      hasShade: true,
      hasColdWater: true,
      hasSeating: true,
    },
    {
      ...base,
      id: 'seed_3',
      type: 'sombra',
      name: 'Árvores do Largo do Arouche',
      description: 'Área arborizada com bancos de praça e boa sombra à tarde.',
      latitude: -23.5428,
      longitude: -46.6450,
      is24h: true,
      opensAt: '00:00',
      closesAt: '23:59',
      hasShade: true,
      hasColdWater: false,
      hasSeating: true,
    },
    {
      ...base,
      id: 'seed_4',
      type: 'bebedouro',
      name: 'Bebedouro do Parque Ibirapuera',
      description: 'Bebedouro perto do portão 3, ao lado dos banheiros públicos.',
      latitude: -23.5869,
      longitude: -46.6580,
      is24h: false,
      opensAt: '05:00',
      closesAt: '00:00',
      hasShade: true,
      hasColdWater: false,
      hasSeating: true,
    },
    {
      ...base,
      id: 'seed_5',
      type: 'descanso',
      name: 'Base de entregadores Pinheiros',
      description: 'Área de descanso com água, banheiro e estacionamento para motos.',
      latitude: -23.5665,
      longitude: -46.6925,
      is24h: false,
      opensAt: '10:00',
      closesAt: '02:00',
      hasShade: true,
      hasColdWater: true,
      hasSeating: true,
    },
    {
      ...base,
      id: 'seed_6',
      type: 'sombra',
      name: 'Marquise da Galeria do Rock',
      description: 'Marquise ampla para se proteger do sol e da chuva no centro.',
      latitude: -23.5440,
      longitude: -46.6385,
      is24h: false,
      opensAt: '09:00',
      closesAt: '19:00',
      hasShade: true,
      hasColdWater: false,
      hasSeating: false,
    },
    {
      ...base,
      id: 'seed_7',
      type: 'bebedouro',
      name: 'Bebedouro da Estação Brás',
      description: 'Bebedouro na saída da estação, perto da bilheteria do metrô.',
      latitude: -23.5450,
      longitude: -46.6160,
      is24h: false,
      opensAt: '04:40',
      closesAt: '00:00',
      hasShade: true,
      hasColdWater: true,
      hasSeating: false,
    },
  ];
}

/** Cria os pontos de exemplo somente na primeira execução. */
export async function ensureSeed(): Promise<void> {
  const exists = await hasStoredKey(POINTS_KEY);
  if (!exists) {
    await writeStoredJson(POINTS_KEY, buildSeedPoints());
  }
}

/** Todos os pontos, em qualquer status (uso interno e do avaliador). */
export async function getAllPoints(): Promise<SupportPoint[]> {
  return readStoredJson(POINTS_KEY, isPointList, []);
}

/** Único caminho de leitura de Início, Mapa e Detalhe: somente aprovados. */
export async function getPublicPoints(): Promise<SupportPoint[]> {
  const points = await getAllPoints();
  return points.filter((point) => point.status === 'aprovado');
}

/** Busca um ponto pelo id, em qualquer status. */
export async function getPointById(id: string): Promise<SupportPoint | null> {
  const points = await getAllPoints();
  return points.find((point) => point.id === id) ?? null;
}

/**
 * Busca para o detalhe público: só devolve os dados quando o ponto está aprovado.
 * Nos demais casos informa apenas o motivo (para a tela mostrar um texto próprio).
 */
export async function getPublicPointById(id: string): Promise<PublicPointLookup> {
  const point = await getPointById(id);
  if (!point) {
    return { kind: 'not_found' };
  }
  if (point.status !== 'aprovado') {
    return { kind: 'unavailable', status: point.status };
  }
  return { kind: 'ok', point };
}

/** Pontos cadastrados por um perfil (qualquer status). */
export async function getPointsByOwner(ownerId: string): Promise<SupportPoint[]> {
  const points = await getAllPoints();
  return points.filter((point) => point.ownerId === ownerId);
}

/** Pontos aguardando avaliação. */
export async function getPendingPoints(): Promise<SupportPoint[]> {
  const points = await getAllPoints();
  return points.filter((point) => point.status === 'em_analise');
}

/** Cria um ponto novo, sempre em análise. */
export async function createPoint(
  input: NewSupportPointInput,
  owner: CitizenProfile,
): Promise<SupportPoint> {
  const validation = validatePointInput(input);
  if (!validation.valid || input.latitude === null || input.longitude === null) {
    throw new Error('Confira os dados do ponto antes de enviar.');
  }
  const now = new Date().toISOString();
  const point: SupportPoint = {
    id: generateId('pt'),
    type: input.type,
    name: input.name.trim(),
    description: input.description.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    is24h: input.is24h,
    opensAt: input.is24h ? '00:00' : input.opensAt,
    closesAt: input.is24h ? '23:59' : input.closesAt,
    hasShade: input.hasShade,
    hasColdWater: input.hasColdWater,
    hasSeating: input.hasSeating,
    photoUri: input.photoUri,
    status: 'em_analise',
    ownerId: owner.id,
    ownerName: owner.name,
    createdAt: now,
    updatedAt: now,
  };
  const points = await getAllPoints();
  await writeStoredJson(POINTS_KEY, [...points, point]);
  return point;
}

/** Atualização de baixo nível do status (atualiza updatedAt). */
export async function updatePointStatus(
  id: string,
  status: SupportPointStatus,
  rejectionReason?: string,
): Promise<SupportPoint> {
  const points = await getAllPoints();
  const target = points.find((point) => point.id === id);
  if (!target) {
    throw new Error('Ponto não encontrado.');
  }
  const updated: SupportPoint = {
    ...target,
    status,
    rejectionReason: status === 'rejeitado' ? rejectionReason : undefined,
    updatedAt: new Date().toISOString(),
  };
  await writeStoredJson(
    POINTS_KEY,
    points.map((point) => (point.id === id ? updated : point)),
  );
  return updated;
}

/**
 * Regra do dono: só quem cadastrou alterna entre aprovado e desativado.
 * Pontos em análise ou rejeitados não alternam.
 */
export async function changeStatusAsOwner(
  id: string,
  ownerId: string,
  status: SupportPointStatus,
): Promise<SupportPoint> {
  const point = await getPointById(id);
  if (!point) {
    throw new Error('Ponto não encontrado.');
  }
  if (point.ownerId !== ownerId) {
    throw new Error('Só quem cadastrou o espaço pode alterá-lo.');
  }
  const isDeactivating = point.status === 'aprovado' && status === 'desativado';
  const isReactivating = point.status === 'desativado' && status === 'aprovado';
  if (!isDeactivating && !isReactivating) {
    throw new Error('Este espaço não pode ser alterado no status atual.');
  }
  return updatePointStatus(id, status);
}

/** Regra do avaliador: aprova ou rejeita pontos em análise (exige modo avaliador). */
export async function reviewPoint(
  id: string,
  status: SupportPointStatus,
  rejectionReason?: string,
): Promise<SupportPoint> {
  const reviewerMode = await getReviewerMode();
  if (!reviewerMode) {
    throw new Error('Ative o modo avaliador para avaliar envios.');
  }
  const point = await getPointById(id);
  if (!point) {
    throw new Error('Ponto não encontrado.');
  }
  if (point.status !== 'em_analise' || (status !== 'aprovado' && status !== 'rejeitado')) {
    throw new Error('Este envio já foi avaliado.');
  }
  if (status === 'rejeitado' && (!rejectionReason || rejectionReason.trim().length === 0)) {
    throw new Error('Informe o motivo da rejeição.');
  }
  return updatePointStatus(id, status, rejectionReason?.trim());
}
