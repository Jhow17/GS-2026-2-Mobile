/**
 * Tipos das rotas (abas inferiores e pilha principal), com suporte a
 * redirecionamento pós-login (M4, M5 e M6).
 */
import type { PointType } from './supportPoint';

/** Destino para retomar ação restrita logo após autenticar. */
export type PostLoginRedirect =
  | { target: 'PointForm'; params?: { initialCategory?: PointType; editPointId?: string } }
  | { target: 'PointDetail'; params: { pointId: string; openReportForm?: boolean } }
  | { target: 'MyPlaces' }
  | { target: 'Collaborate' }
  | { target: 'Admin' };

/** Abas da barra inferior (visibilidade dinâmica conforme perfil na M4). */
export type RootTabParamList = {
  Start: undefined;
  Map: { focusPointId?: string } | undefined;
  Weather: undefined;
  Collaborate: undefined;
  Admin: undefined;
  Account: undefined;
};

/** Pilha raiz (contém as abas e as telas empilhadas). */
export type RootStackParamList = {
  Tabs: undefined;
  PointDetail: { pointId: string; openReportForm?: boolean };
  PointForm: { initialCategory?: PointType; editPointId?: string } | undefined;
  MyPlaces: undefined;
  Login: { redirectTo?: PostLoginRedirect; reasonMessage?: string } | undefined;
  Register: { redirectTo?: PostLoginRedirect } | undefined;
};
