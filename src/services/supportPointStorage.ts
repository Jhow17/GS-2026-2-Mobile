/**
 * Persistência dos pontos de apoio no AsyncStorage e semeadura inicial
 * de sete pontos reais de São Paulo na primeira execução.
 * Inclui suporte a edição completa, exclusão administrativa e trilha de auditoria (M7/M8).
 */
import type { CitizenProfile } from '../types/profile';
import type {
  Amenity,
  NewSupportPointInput,
  PointAddress,
  PointStatus,
  PointType,
  SupportPoint,
} from '../types/supportPoint';
import { formatStructuredAddress } from '../utils/formatters';
import { generateId } from '../utils/generateId';
import { isRecord, isValidCoordinates } from '../utils/validation';
import {
  hasStoredKey,
  readStoredJson,
  STORAGE_PREFIX,
  writeStoredJson,
} from './cacheStorage';

const POINTS_KEY = `${STORAGE_PREFIX}points`;
const DELETED_SEEDS_KEY = `${STORAGE_PREFIX}deleted_seeds`;

const VALID_TYPES: readonly PointType[] = ['bebedouro', 'sombra', 'descanso', 'parceiro'];
const VALID_STATUSES: readonly PointStatus[] = ['pending', 'approved', 'rejected'];
const VALID_AMENITIES: readonly Amenity[] = [
  'agua_potavel',
  'banheiro',
  'banco',
  'tomada',
  'sombra_coberta',
  'ar_condicionado',
];

// ---------------------------------------------------------------------------
// Sete pontos iniciais em São Paulo (aprovados e ativos)
// ---------------------------------------------------------------------------

const SEED_POINTS: readonly SupportPoint[] = [
  {
    id: 'seed_1',
    type: 'bebedouro',
    name: 'Bebedouro Público — Praça da Sé',
    description: 'Ponto de água potável gratuito próximo à saída do metrô Sé.',
    address: 'Praça da Sé, s/n - Sé, São Paulo/SP · CEP 01001-000',
    structuredAddress: {
      cep: '01001-000',
      street: 'Praça da Sé',
      number: 'S/N',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5503,
    longitude: -46.6339,
    opensAt: '06:00',
    closesAt: '22:00',
    is24h: false,
    amenities: ['agua_potavel', 'banco'],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'Prefeitura / Sabesp',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'seed_2',
    type: 'sombra',
    name: 'Marquise e Bosque — Parque Ibirapuera (Portão 3)',
    description: 'Área arborizada com sombra densa, bebedouros e sanitários gratuitos.',
    address: 'Av. Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo/SP · CEP 04094-050',
    structuredAddress: {
      cep: '04094-050',
      street: 'Av. Pedro Álvares Cabral',
      number: 'S/N',
      complement: 'Portão 3',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5874,
    longitude: -46.6576,
    opensAt: '05:00',
    closesAt: '23:00',
    is24h: false,
    amenities: ['agua_potavel', 'banheiro', 'banco', 'sombra_coberta'],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'CitizenTech',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'seed_3',
    type: 'descanso',
    name: 'Ponto de Apoio ao Entregador — Paulista',
    description: 'Espaço coberto com bancos, água gelada e tomadas para recarga de celular.',
    address: 'Av. Paulista, 1374 - Bela Vista, São Paulo/SP · CEP 01310-100',
    structuredAddress: {
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1374',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5629,
    longitude: -46.6544,
    opensAt: '08:00',
    closesAt: '22:00',
    is24h: false,
    amenities: ['agua_potavel', 'banheiro', 'banco', 'tomada', 'sombra_coberta'],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'CitizenTech',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'seed_4',
    type: 'parceiro',
    name: 'Padaria Estrela do Tatuapé (Ponto Parceiro)',
    description: 'Oferece reabastecimento de garrafa de água e uso do banheiro para entregadores.',
    address: 'Rua Tuiuti, 2100 - Tatuapé, São Paulo/SP · CEP 03307-005',
    structuredAddress: {
      cep: '03307-005',
      street: 'Rua Tuiuti',
      number: '2100',
      neighborhood: 'Tatuapé',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5408,
    longitude: -46.5752,
    opensAt: '06:00',
    closesAt: '21:00',
    is24h: false,
    amenities: ['agua_potavel', 'banheiro', 'sombra_coberta'],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'Comércio Parceiro',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'seed_5',
    type: 'bebedouro',
    name: 'Largo da Batata — Estação de Hidratação',
    description: 'Bebedouro público ao lado da saída da estação Faria Lima.',
    address: 'Av. Brigadeiro Faria Lima, s/n - Pinheiros, São Paulo/SP · CEP 05426-100',
    structuredAddress: {
      cep: '05426-100',
      street: 'Av. Brigadeiro Faria Lima',
      number: 'S/N',
      neighborhood: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5672,
    longitude: -46.6952,
    opensAt: '00:00',
    closesAt: '23:59',
    is24h: true,
    amenities: ['agua_potavel', 'banco'],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'Prefeitura / Sabesp',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'seed_6',
    type: 'sombra',
    name: 'Parque da Juventude — Área de Descanso',
    description: 'Gramado arborizado com quiosques cobertos e bebedouros.',
    address: 'Av. Cruzeiro do Sul, 2630 - Santana, São Paulo/SP · CEP 02030-100',
    structuredAddress: {
      cep: '02030-100',
      street: 'Av. Cruzeiro do Sul',
      number: '2630',
      neighborhood: 'Santana',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5072,
    longitude: -46.6245,
    opensAt: '06:00',
    closesAt: '19:00',
    is24h: false,
    amenities: ['agua_potavel', 'banheiro', 'banco', 'sombra_coberta'],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'CitizenTech',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'seed_7',
    type: 'parceiro',
    name: 'Centro Cultural São Paulo — Área de Convivência',
    description: 'Espaço ventilado e gratuito com água potável, bancos, tomadas e banheiros.',
    address: 'Rua Vergueiro, 1000 - Liberdade, São Paulo/SP · CEP 01504-000',
    structuredAddress: {
      cep: '01504-000',
      street: 'Rua Vergueiro',
      number: '1000',
      neighborhood: 'Liberdade',
      city: 'São Paulo',
      state: 'SP',
    },
    latitude: -23.5712,
    longitude: -46.6398,
    opensAt: '10:00',
    closesAt: '20:00',
    is24h: false,
    amenities: [
      'agua_potavel',
      'banheiro',
      'banco',
      'tomada',
      'sombra_coberta',
      'ar_condicionado',
    ],
    status: 'approved',
    active: true,
    createdBy: 'seed',
    createdByName: 'Equipamento Público',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Guardas de tipo
// ---------------------------------------------------------------------------

function isPointType(value: unknown): value is PointType {
  return typeof value === 'string' && (VALID_TYPES as readonly string[]).includes(value);
}

function isPointStatus(value: unknown): value is PointStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}

function isAmenityList(value: unknown): value is Amenity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is Amenity =>
        typeof item === 'string' && (VALID_AMENITIES as readonly string[]).includes(item),
    )
  );
}

function isSupportPoint(value: unknown): value is SupportPoint {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    isPointType(value.type) &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.address === 'string' &&
    isValidCoordinates(value.latitude, value.longitude) &&
    typeof value.opensAt === 'string' &&
    typeof value.closesAt === 'string' &&
    typeof value.is24h === 'boolean' &&
    isAmenityList(value.amenities) &&
    isPointStatus(value.status) &&
    typeof value.active === 'boolean' &&
    typeof value.createdBy === 'string' &&
    typeof value.createdByName === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function isSupportPointList(value: unknown): value is SupportPoint[] {
  return Array.isArray(value) && value.every(isSupportPoint);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string');
}

// ---------------------------------------------------------------------------
// Operações públicas
// ---------------------------------------------------------------------------

/**
 * Semeia os 7 pontos iniciais caso a chave ainda não exista, ou caso uma gravação
 * antiga tenha deixado a lista vazia (respeitando seeds que o Admin tenha excluído).
 */
export async function ensureSeededPoints(): Promise<SupportPoint[]> {
  const deletedSeeds = await readStoredJson<string[]>(DELETED_SEEDS_KEY, isStringArray, []);
  const activeSeeds = SEED_POINTS.filter((seed) => !deletedSeeds.includes(seed.id));

  const exists = await hasStoredKey(POINTS_KEY);
  if (!exists) {
    await writeStoredJson(POINTS_KEY, activeSeeds);
    return [...activeSeeds];
  }
  const current = await readStoredJson<SupportPoint[]>(POINTS_KEY, isSupportPointList, []);
  if (current.length === 0 && activeSeeds.length > 0) {
    await writeStoredJson(POINTS_KEY, activeSeeds);
    return [...activeSeeds];
  }
  return current;
}

/** Devolve todos os pontos (aprovados, pendentes e rejeitados). */
export async function getAllPoints(): Promise<SupportPoint[]> {
  return ensureSeededPoints();
}

/** Cria um novo pedido de ponto de apoio (entra sempre como "pending"). */
export async function createPointRequest(
  input: NewSupportPointInput,
  author: CitizenProfile,
): Promise<SupportPoint> {
  const current = await getAllPoints();
  const resolvedAddress =
    input.structuredAddress && input.structuredAddress.street.trim().length > 0
      ? formatStructuredAddress(input.structuredAddress)
      : input.address.trim();

  const newPoint: SupportPoint = {
    id: generateId('point'),
    type: input.type,
    name: input.name.trim(),
    description: input.description.trim(),
    address: resolvedAddress,
    structuredAddress: input.structuredAddress,
    latitude: input.latitude ?? 0,
    longitude: input.longitude ?? 0,
    opensAt: input.is24h ? '00:00' : input.opensAt,
    closesAt: input.is24h ? '23:59' : input.closesAt,
    is24h: input.is24h,
    amenities: input.amenities,
    photoUri: input.photoUri,
    status: 'pending',
    active: true,
    createdBy: author.id,
    createdByName: author.name,
    createdByContact: author.contact,
    createdAt: new Date().toISOString(),
  };

  const next = [newPoint, ...current];
  await writeStoredJson(POINTS_KEY, next);
  return newPoint;
}

/** Edita os dados cadastrais de um ponto existente (Admin - M7). */
export async function updatePoint(
  id: string,
  input: NewSupportPointInput,
  editorName: string,
): Promise<SupportPoint[]> {
  const current = await getAllPoints();
  const resolvedAddress =
    input.structuredAddress && input.structuredAddress.street.trim().length > 0
      ? formatStructuredAddress(input.structuredAddress)
      : input.address.trim();

  const next = current.map((point): SupportPoint => {
    if (point.id !== id) {
      return point;
    }
    const structuredAddress: PointAddress | undefined = input.structuredAddress
      ? {
          cep: input.structuredAddress.cep?.trim(),
          street: input.structuredAddress.street.trim(),
          number: input.structuredAddress.number?.trim(),
          complement: input.structuredAddress.complement?.trim(),
          neighborhood: input.structuredAddress.neighborhood?.trim(),
          city: input.structuredAddress.city?.trim(),
          state: input.structuredAddress.state?.trim().toUpperCase(),
        }
      : point.structuredAddress;

    return {
      ...point,
      type: input.type,
      name: input.name.trim(),
      description: input.description.trim(),
      address: resolvedAddress,
      structuredAddress,
      latitude: input.latitude ?? point.latitude,
      longitude: input.longitude ?? point.longitude,
      opensAt: input.is24h ? '00:00' : input.opensAt,
      closesAt: input.is24h ? '23:59' : input.closesAt,
      is24h: input.is24h,
      amenities: input.amenities,
      photoUri: input.photoUri,
      updatedBy: editorName,
      updatedAt: new Date().toISOString(),
    };
  });

  await writeStoredJson(POINTS_KEY, next);
  return next;
}

/** Atualiza o status (aprovar ou rejeitar) com trilha de auditoria (M7). */
export async function updatePointStatus(
  id: string,
  status: PointStatus,
  reviewerName?: string,
  rejectionReason?: string,
): Promise<SupportPoint[]> {
  const current = await getAllPoints();
  const nowIso = new Date().toISOString();
  const next = current.map((point) =>
    point.id === id
      ? {
          ...point,
          status,
          active: status === 'approved' ? true : point.active,
          reviewedBy: reviewerName ?? point.reviewedBy,
          reviewedAt: nowIso,
          rejectionReason:
            status === 'rejected'
              ? rejectionReason?.trim() || 'Rejeitado pela moderação.'
              : undefined,
        }
      : point,
  );
  await writeStoredJson(POINTS_KEY, next);
  return next;
}

/** Liga ou desliga um ponto (usado pelo dono do espaço ou pelo administrador). */
export async function togglePointActive(
  id: string,
  active: boolean,
  actorName?: string,
): Promise<SupportPoint[]> {
  const current = await getAllPoints();
  const next = current.map((point) =>
    point.id === id
      ? {
          ...point,
          active,
          updatedBy: actorName ?? point.updatedBy,
          updatedAt: new Date().toISOString(),
        }
      : point,
  );
  await writeStoredJson(POINTS_KEY, next);
  return next;
}

/** Remove definitivamente um ponto de apoio do armazenamento (M7 - Opção 6A). */
export async function deletePoint(id: string): Promise<SupportPoint[]> {
  if (id.startsWith('seed_')) {
    const deletedSeeds = await readStoredJson<string[]>(DELETED_SEEDS_KEY, isStringArray, []);
    if (!deletedSeeds.includes(id)) {
      await writeStoredJson(DELETED_SEEDS_KEY, [...deletedSeeds, id]);
    }
  }
  const current = await getAllPoints();
  const next = current.filter((point) => point.id !== id);
  await writeStoredJson(POINTS_KEY, next);
  return next;
}
