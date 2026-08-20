import { useUnit } from 'effector-react';
import { useSyncExternalStore } from 'react';

import { INITIATOR_COLUMN_MEDIA_QUERY } from '@/shared/ui/operations-table-layout';

import { operationsTableLayoutModel } from './model';

export const useOperationColumnWidths = () => useUnit(operationsTableLayoutModel.$columnWidths);
export const useIsResizingColumns = () => useUnit(operationsTableLayoutModel.$resizingColumn) !== null;

// One MediaQueryList shared by subscribe and snapshot: a fresh `matchMedia` per
// snapshot call would allocate on every render, and subscribing to a different
// object than the one being read invites the two to drift.
let initiatorMedia: MediaQueryList | null = null;
const getInitiatorMedia = () => (initiatorMedia ??= window.matchMedia(INITIATOR_COLUMN_MEDIA_QUERY));

const subscribeToInitiatorBreakpoint = (onChange: () => void) => {
  const media = getInitiatorMedia();
  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
};
const getInitiatorBreakpoint = () => getInitiatorMedia().matches;

/**
 * Mirrors the Tailwind `2xl:` gate on the Initiator column so JS (min-width
 * maths) and CSS agree on whether the column is rendered.
 */
export const useIsInitiatorColumnVisible = () =>
  useSyncExternalStore(subscribeToInitiatorBreakpoint, getInitiatorBreakpoint, () => false);
