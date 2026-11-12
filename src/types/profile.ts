/**
 * Perfil local do cidadão (sem login; guardado só no aparelho).
 */

export interface CitizenProfile {
  id: string;
  name: string;
  contact?: string;
  createdAt: string;
}

/** Campos preenchidos no ProfileModal. */
export interface ProfileInput {
  name: string;
  contact?: string;
}
