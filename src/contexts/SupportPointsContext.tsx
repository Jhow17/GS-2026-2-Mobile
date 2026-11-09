/**
 * Contexto dos pontos de apoio e relatos, compartilhado entre Início, Mapa,
 * Detalhe, Meus espaços e Avaliador. Carrega uma única vez (e quando o perfil muda).
 */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useProfile } from '../hooks/useProfile';
import * as reportStorage from '../services/reportStorage';
import * as supportPointStorage from '../services/supportPointStorage';
import type { PublicPointLookup } from '../services/supportPointStorage';
import type { FountainReport, NewReportInput } from '../types/report';
import type {
  NewSupportPointInput,
  SupportPoint,
  SupportPointStatus,
} from '../types/supportPoint';

export interface SupportPointsContextValue {
  /** Somente pontos públicos (aprovados). */
  points: SupportPoint[];
  /** Pontos do perfil atual, em qualquer status. */
  myPoints: SupportPoint[];
  /** Envios aguardando o avaliador. */
  pendingPoints: SupportPoint[];
  /** Relatos abertos (avaliador). */
  openReports: FountainReport[];
  /** Quantidade de relatos abertos por id de ponto. */
  openReportsByPoint: Record<string, number>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addPoint: (input: NewSupportPointInput) => Promise<SupportPoint>;
  changeStatus: (id: string, status: SupportPointStatus, reason?: string) => Promise<void>;
  addReport: (input: NewReportInput) => Promise<FountainReport>;
  resolveReport: (id: string) => Promise<void>;
  loadPublicPoint: (id: string) => Promise<PublicPointLookup>;
}

export const SupportPointsContext = createContext<SupportPointsContextValue | null>(null);

interface Snapshot {
  points: SupportPoint[];
  myPoints: SupportPoint[];
  pendingPoints: SupportPoint[];
  openReports: FountainReport[];
  openReportsByPoint: Record<string, number>;
}

const LOAD_ERROR = 'Não foi possível carregar os pontos de apoio. Tente de novo.';

/** Lê tudo dos services de armazenamento. */
async function loadSnapshot(profileId: string | null): Promise<Snapshot> {
  await supportPointStorage.ensureSeed();
  const [points, myPoints, pendingPoints, openReports, openReportsByPoint] = await Promise.all([
    supportPointStorage.getPublicPoints(),
    profileId ? supportPointStorage.getPointsByOwner(profileId) : Promise.resolve([]),
    supportPointStorage.getPendingPoints(),
    reportStorage.getOpenReports(),
    reportStorage.countOpenReportsByPoint(),
  ]);
  return { points, myPoints, pendingPoints, openReports, openReportsByPoint };
}

interface SupportPointsProviderProps {
  children: ReactNode;
}

export function SupportPointsProvider({ children }: SupportPointsProviderProps) {
  const { profile, loading: profileLoading } = useProfile();
  const profileId = profile?.id ?? null;

  const [points, setPoints] = useState<SupportPoint[]>([]);
  const [myPoints, setMyPoints] = useState<SupportPoint[]>([]);
  const [pendingPoints, setPendingPoints] = useState<SupportPoint[]>([]);
  const [openReports, setOpenReports] = useState<FountainReport[]>([]);
  const [openReportsByPoint, setOpenReportsByPoint] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySnapshot = useCallback((snapshot: Snapshot): void => {
    setPoints(snapshot.points);
    setMyPoints(snapshot.myPoints);
    setPendingPoints(snapshot.pendingPoints);
    setOpenReports(snapshot.openReports);
    setOpenReportsByPoint(snapshot.openReportsByPoint);
  }, []);

  // Carga inicial (e quando o perfil muda), protegida contra desmontagem.
  useEffect(() => {
    if (profileLoading) {
      return undefined;
    }
    let active = true;

    async function loadPoints(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await loadSnapshot(profileId);
        if (active) {
          applySnapshot(snapshot);
        }
      } catch {
        if (active) {
          setError(LOAD_ERROR);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPoints();
    return () => {
      active = false;
    };
  }, [profileId, profileLoading, applySnapshot]);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      applySnapshot(await loadSnapshot(profileId));
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [profileId, applySnapshot]);

  /** Reflete um ponto alterado em todas as listas, sem mutar o estado. */
  const applyUpdatedPoint = useCallback(
    (updated: SupportPoint): void => {
      setPoints((current) => {
        const others = current.filter((point) => point.id !== updated.id);
        return updated.status === 'aprovado' ? [...others, updated] : others;
      });
      setMyPoints((current) =>
        updated.ownerId === profileId
          ? current.map((point) => (point.id === updated.id ? updated : point))
          : current,
      );
      setPendingPoints((current) =>
        updated.status === 'em_analise'
          ? current.map((point) => (point.id === updated.id ? updated : point))
          : current.filter((point) => point.id !== updated.id),
      );
    },
    [profileId],
  );

  const addPoint = useCallback(
    async (input: NewSupportPointInput): Promise<SupportPoint> => {
      if (!profile) {
        throw new Error('Identifique-se para cadastrar um ponto.');
      }
      const created = await supportPointStorage.createPoint(input, profile);
      setMyPoints((current) => [...current, created]);
      setPendingPoints((current) => [...current, created]);
      return created;
    },
    [profile],
  );

  const changeStatus = useCallback(
    async (id: string, status: SupportPointStatus, reason?: string): Promise<void> => {
      const isPending = pendingPoints.some((point) => point.id === id);
      let updated: SupportPoint;
      if (isPending) {
        // Avaliador aprova ou rejeita (o service confere o modo avaliador).
        updated = await supportPointStorage.reviewPoint(id, status, reason);
      } else {
        // Dono desativa ou reativa (o service confere a posse).
        if (!profileId) {
          throw new Error('Identifique-se para alterar seus espaços.');
        }
        updated = await supportPointStorage.changeStatusAsOwner(id, profileId, status);
      }
      applyUpdatedPoint(updated);
    },
    [pendingPoints, profileId, applyUpdatedPoint],
  );

  const addReport = useCallback(
    async (input: NewReportInput): Promise<FountainReport> => {
      if (!profile) {
        throw new Error('Identifique-se para reportar um problema.');
      }
      const created = await reportStorage.createReport(input, profile);
      setOpenReports((current) => [...current, created]);
      setOpenReportsByPoint((current) => ({
        ...current,
        [created.pointId]: (current[created.pointId] ?? 0) + 1,
      }));
      return created;
    },
    [profile],
  );

  const resolveReport = useCallback(async (id: string): Promise<void> => {
    const resolved = await reportStorage.resolveReport(id);
    setOpenReports((current) => current.filter((report) => report.id !== id));
    setOpenReportsByPoint((current) => {
      const remaining = Math.max(0, (current[resolved.pointId] ?? 0) - 1);
      return { ...current, [resolved.pointId]: remaining };
    });
  }, []);

  const loadPublicPoint = useCallback(
    (id: string): Promise<PublicPointLookup> => supportPointStorage.getPublicPointById(id),
    [],
  );

  const value = useMemo<SupportPointsContextValue>(
    () => ({
      points,
      myPoints,
      pendingPoints,
      openReports,
      openReportsByPoint,
      loading,
      error,
      reload,
      addPoint,
      changeStatus,
      addReport,
      resolveReport,
      loadPublicPoint,
    }),
    [
      points,
      myPoints,
      pendingPoints,
      openReports,
      openReportsByPoint,
      loading,
      error,
      reload,
      addPoint,
      changeStatus,
      addReport,
      resolveReport,
      loadPublicPoint,
    ],
  );

  return <SupportPointsContext.Provider value={value}>{children}</SupportPointsContext.Provider>;
}
