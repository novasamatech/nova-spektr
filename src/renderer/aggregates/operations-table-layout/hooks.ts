import { useUnit } from 'effector-react';
import { useSyncExternalStore } from 'react';

import { INITIATOR_COLUMN_MEDIA_QUERY } from '@/shared/ui/operations-table-layout';

import { operationsTableLayoutModel } from './model';

export const useOperationColumnWidths = () => useUnit(operationsTableLayoutModel.$columnWidths);
export const useIsResizingColumns = () => useUnit(operationsTableLayoutModel.$resizingColumn) !== null;

const subscribeToInitiatorBreakpoint = (onChange: () => void) => {
  const media = window.matchMedia(INITIATOR_COLUMN_MEDIA_QUERY);
  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
};
const getInitiatorBreakpoint = () => window.matchMedia(INITIATOR_COLUMN_MEDIA_QUERY).matches;

/**
 * Mirrors the Tailwind `2xl:` gate on the Initiator column so JS (min-width
 * maths) and CSS agree on whether the column is rendered.
 */
export const useIsInitiatorColumnVisible = () =>
  useSyncExternalStore(subscribeToInitiatorBreakpoint, getInitiatorBreakpoint, () => false);
