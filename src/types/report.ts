/**
 * Tipos dos relatos de problema em pontos de apoio (ex.: bebedouro com defeito).
 */

/** Estado do relato. */
export type ReportStatus = 'open' | 'resolved';

/** Relato salvo no armazenamento local. */
export interface DefectReport {
  id: string;
  pointId: string;
  pointName: string;
  description: string;
  photoUri?: string;
  status: ReportStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  /** Metadados de auditoria ao resolver relato (M7). */
  resolvedBy?: string;
  resolvedAt?: string;
}

/** Dados do formulário de novo relato. */
export interface NewReportInput {
  pointId: string;
  pointName: string;
  description: string;
  photoUri?: string;
}
