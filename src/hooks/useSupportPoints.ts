/**
 * Consome o SupportPointsContext (lança erro claro fora do provider).
 */
import { useContext } from 'react';

import {
  SupportPointsContext,
  type SupportPointsContextValue,
} from '../contexts/SupportPointsContext';

export function useSupportPoints(): SupportPointsContextValue {
  const context = useContext(SupportPointsContext);
  if (!context) {
    throw new Error('useSupportPoints deve ser usado dentro de <SupportPointsProvider>.');
  }
  return context;
}
