/**
 * Persistência dos relatos de problema (ex.: bebedouro com defeito) no AsyncStorage.
 * Inclui resolução com auditoria e exclusão individual ou em cascata por ponto (M7).
 */
import type { CitizenProfile } from '../types/profile';
import type { DefectReport, NewReportInput, ReportStatus } from '../types/report';
import { generateId } from '../utils/generateId';
import { isRecord } from '../utils/validation';
import { readStoredJson, STORAGE_PREFIX, writeStoredJson } from './cacheStorage';

const REPORTS_KEY = `${STORAGE_PREFIX}reports`;

function isReportStatus(value: unknown): value is ReportStatus {
  return value === 'open' || value === 'resolved';
}

function isDefectReport(value: unknown): value is DefectReport {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.pointId === 'string' &&
    typeof value.pointName === 'string' &&
    typeof value.description === 'string' &&
    isReportStatus(value.status) &&
    typeof value.createdBy === 'string' &&
    typeof value.createdByName === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function isDefectReportList(value: unknown): value is DefectReport[] {
  return Array.isArray(value) && value.every(isDefectReport);
}

/** Lê todos os relatos salvos. */
export async function getAllReports(): Promise<DefectReport[]> {
  return readStoredJson<DefectReport[]>(REPORTS_KEY, isDefectReportList, []);
}

/** Cria um novo relato de problema com status "open". */
export async function createReport(
  input: NewReportInput,
  author: CitizenProfile,
): Promise<DefectReport> {
  const current = await getAllReports();
  const report: DefectReport = {
    id: generateId('report'),
    pointId: input.pointId,
    pointName: input.pointName,
    description: input.description.trim(),
    photoUri: input.photoUri,
    status: 'open',
    createdBy: author.id,
    createdByName: author.name,
    createdAt: new Date().toISOString(),
  };

  const next = [report, ...current];
  await writeStoredJson(REPORTS_KEY, next);
  return report;
}

/** Marca um relato como resolvido com metadados de auditoria (M7). */
export async function resolveReport(
  id: string,
  resolverName?: string,
): Promise<DefectReport[]> {
  const current = await getAllReports();
  const next = current.map((report) =>
    report.id === id
      ? {
          ...report,
          status: 'resolved' as const,
          resolvedBy: resolverName ?? report.resolvedBy,
          resolvedAt: new Date().toISOString(),
        }
      : report,
  );
  await writeStoredJson(REPORTS_KEY, next);
  return next;
}

/** Exclui definitivamente um relato de defeito (M7). */
export async function deleteReport(id: string): Promise<DefectReport[]> {
  const current = await getAllReports();
  const next = current.filter((report) => report.id !== id);
  await writeStoredJson(REPORTS_KEY, next);
  return next;
}

/** Remove todos os relatos vinculados a um ponto excluído (M7 - Opção 6A). */
export async function deleteReportsByPointId(pointId: string): Promise<DefectReport[]> {
  const current = await getAllReports();
  const next = current.filter((report) => report.pointId !== pointId);
  await writeStoredJson(REPORTS_KEY, next);
  return next;
}
