import { type EraIndex } from '@/shared/core';
import { type ActiveEraAnchor } from '@/domains/staking';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When `era` started, walked back from the active era's anchor — or `null` when
 * a date cannot be stated honestly: no anchor yet, or eras shorter than a day,
 * where several eras share a date and any single label would be arbitrary (in
 * practice Kusama's 6h eras). Polkadot's 24h eras qualify.
 */
export const deriveEraDateMs = (anchor: ActiveEraAnchor | null, era: EraIndex): number | null => {
  if (!anchor || anchor.eraDurationMs < DAY_MS) return null;

  return anchor.eraStartMs - (anchor.era - era) * anchor.eraDurationMs;
};
