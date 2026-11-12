/**
 * Contexto dos pontos de apoio e relatos de problema.
 * Centraliza a leitura e as ações de criação, edição, aprovação, rejeição,
 * ativação/desativação, resolução e exclusão para que todas as telas
 * (Início, Mapa, Detalhe, Colaborar, Meus pontos e Admin) enxerguem o mesmo estado.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as photoService from '../services/photoService';
import * as reportStorage from '../services/reportStorage';
import * as supportPointStorage from '../services/supportPointStorage';
import type { CitizenProfile } from '../types/profile';
import type { DefectReport, NewReportInput } from '../types/report';
import type { NewSupportPointInput, SupportPoint } from '../types/supportPoint';

export interface SupportPointsContextValue {
  points: SupportPoint[];
  reports: DefectReport[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  requestPoint: (
    input: NewSupportPointInput,
    author: CitizenProfile,
  ) => Promise<SupportPoint>;
  updatePoint: (
    id: string,
    input: NewSupportPointInput,
    editorName: string,
  ) => Promise<void>;
  approvePoint: (id: string, reviewerName?: string) => Promise<void>;
  rejectPoint: (
    id: string,
    reviewerName?: string,
    rejectionReason?: string,
  ) => Promise<void>;
  toggleActive: (id: string, active: boolean, actorName?: string) => Promise<void>;
  deletePoint: (id: string) => Promise<void>;
  reportDefect: (input: NewReportInput, author: CitizenProfile) => Promise<DefectReport>;
  resolveReport: (id: string, resolverName?: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

export const SupportPointsContext = createContext<SupportPointsContextValue | null>(
  null,
);

const LOAD_ERROR = 'Não foi possível carregar os pontos de apoio.';

interface SupportPointsProviderProps {
  children: ReactNode;
}

export function SupportPointsProvider({ children }: SupportPointsProviderProps) {
  const [points, setPoints] = useState<SupportPoint[]>([]);
  const [reports, setReports] = useState<DefectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [loadedPoints, loadedReports] = await Promise.all([
        supportPointStorage.getAllPoints(),
        reportStorage.getAllReports(),
      ]);
      setPoints(loadedPoints);
      setReports(loadedReports);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPoint = useCallback(
    async (
      input: NewSupportPointInput,
      author: CitizenProfile,
    ): Promise<SupportPoint> => {
      const persistedPhoto = input.photoUri
        ? await photoService.persistPhoto(input.photoUri)
        : undefined;
      const created = await supportPointStorage.createPointRequest(
        { ...input, photoUri: persistedPhoto },
        author,
      );
      setPoints((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const updatePoint = useCallback(
    async (
      id: string,
      input: NewSupportPointInput,
      editorName: string,
    ): Promise<void> => {
      const persistedPhoto = input.photoUri
        ? await photoService.persistPhoto(input.photoUri)
        : undefined;
      const next = await supportPointStorage.updatePoint(
        id,
        { ...input, photoUri: persistedPhoto },
        editorName,
      );
      setPoints(next);
    },
    [],
  );

  const approvePoint = useCallback(
    async (id: string, reviewerName?: string): Promise<void> => {
      const next = await supportPointStorage.updatePointStatus(
        id,
        'approved',
        reviewerName,
      );
      setPoints(next);
    },
    [],
  );

  const rejectPoint = useCallback(
    async (
      id: string,
      reviewerName?: string,
      rejectionReason?: string,
    ): Promise<void> => {
      const next = await supportPointStorage.updatePointStatus(
        id,
        'rejected',
        reviewerName,
        rejectionReason,
      );
      setPoints(next);
    },
    [],
  );

  const toggleActive = useCallback(
    async (id: string, active: boolean, actorName?: string): Promise<void> => {
      const next = await supportPointStorage.togglePointActive(id, active, actorName);
      setPoints(next);
    },
    [],
  );

  const deletePoint = useCallback(async (id: string): Promise<void> => {
    const [nextPoints, nextReports] = await Promise.all([
      supportPointStorage.deletePoint(id),
      reportStorage.deleteReportsByPointId(id),
    ]);
    setPoints(nextPoints);
    setReports(nextReports);
  }, []);

  const reportDefect = useCallback(
    async (input: NewReportInput, author: CitizenProfile): Promise<DefectReport> => {
      const persistedPhoto = input.photoUri
        ? await photoService.persistPhoto(input.photoUri)
        : undefined;
      const created = await reportStorage.createReport(
        { ...input, photoUri: persistedPhoto },
        author,
      );
      setReports((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const resolveReport = useCallback(
    async (id: string, resolverName?: string): Promise<void> => {
      const next = await reportStorage.resolveReport(id, resolverName);
      setReports(next);
    },
    [],
  );

  const deleteReport = useCallback(async (id: string): Promise<void> => {
    const next = await reportStorage.deleteReport(id);
    setReports(next);
  }, []);

  const value = useMemo<SupportPointsContextValue>(
    () => ({
      points,
      reports,
      loading,
      error,
      refresh,
      requestPoint,
      updatePoint,
      approvePoint,
      rejectPoint,
      toggleActive,
      deletePoint,
      reportDefect,
      resolveReport,
      deleteReport,
    }),
    [
      points,
      reports,
      loading,
      error,
      refresh,
      requestPoint,
      updatePoint,
      approvePoint,
      rejectPoint,
      toggleActive,
      deletePoint,
      reportDefect,
      resolveReport,
      deleteReport,
    ],
  );

  return (
    <SupportPointsContext.Provider value={value}>
      {children}
    </SupportPointsContext.Provider>
  );
}
