/**
 * Relatos de bebedouro avariado.
 */

export type ReportStatus = 'aberto' | 'resolvido';

export interface FountainReport {
  id: string;
  pointId: string;
  description: string;
  photoUri?: string;
  authorId: string;
  authorName: string;
  status: ReportStatus;
  createdAt: string;
}

/** Campos preenchidos pelo formulário de relato. */
export interface NewReportInput {
  pointId: string;
  description: string;
  photoUri?: string;
}
