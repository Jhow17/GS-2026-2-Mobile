/**
 * Relatos de bebedouro avariado no AsyncStorage (@citizentech:v1:reports).
 * Toda escrita lê a lista, copia com spread e regrava a lista inteira.
 */
import type { CitizenProfile } from '../types/profile';
import type { FountainReport, NewReportInput } from '../types/report';
import { generateId } from '../utils/generateId';
import { isArrayOf, isFountainReport, validateReportInput } from '../utils/validation';
import { readStoredJson, STORAGE_PREFIX, writeStoredJson } from './cacheStorage';

const REPORTS_KEY = `${STORAGE_PREFIX}reports`;

function isReportList(value: unknown): value is FountainReport[] {
  return isArrayOf(value, isFountainReport);
}

async function getAllReports(): Promise<FountainReport[]> {
  return readStoredJson(REPORTS_KEY, isReportList, []);
}

/** Cria um relato aberto. */
export async function createReport(
  input: NewReportInput,
  author: CitizenProfile,
): Promise<FountainReport> {
  const validation = validateReportInput(input);
  if (!validation.valid) {
    throw new Error('Confira os dados do relato antes de enviar.');
  }
  const report: FountainReport = {
    id: generateId('rep'),
    pointId: input.pointId,
    description: input.description.trim(),
    photoUri: input.photoUri,
    authorId: author.id,
    authorName: author.name,
    status: 'aberto',
    createdAt: new Date().toISOString(),
  };
  const reports = await getAllReports();
  await writeStoredJson(REPORTS_KEY, [...reports, report]);
  return report;
}

/** Relatos ainda abertos. */
export async function getOpenReports(): Promise<FountainReport[]> {
  const reports = await getAllReports();
  return reports.filter((report) => report.status === 'aberto');
}

/** Quantidade de relatos abertos por id de ponto. */
export async function countOpenReportsByPoint(): Promise<Record<string, number>> {
  const open = await getOpenReports();
  return open.reduce<Record<string, number>>(
    (acc, report) => ({ ...acc, [report.pointId]: (acc[report.pointId] ?? 0) + 1 }),
    {},
  );
}

/** Marca um relato como resolvido. */
export async function resolveReport(id: string): Promise<FountainReport> {
  const reports = await getAllReports();
  const target = reports.find((report) => report.id === id);
  if (!target) {
    throw new Error('Relato não encontrado.');
  }
  const updated: FountainReport = { ...target, status: 'resolvido' };
  await writeStoredJson(
    REPORTS_KEY,
    reports.map((report) => (report.id === id ? updated : report)),
  );
  return updated;
}
