import { type EraIndex } from '@/shared/core';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A known era's start plus how long an era lasts on that chain. */
export type EraTimeline = {
  /** Unix ms the anchored (active) era became active. */
  startMs: number;
  eraDurationMs: number;
};

/**
 * When `era` started, walked back from the active era's anchor — or `null` when
 * a date cannot be stated honestly: no timeline yet, or eras shorter than a
 * day, where several eras share a date and any single label would be arbitrary
 * (in practice Kusama's 6h eras). Polkadot's 24h eras qualify.
 */
export const deriveEraDateMs = (timeline: EraTimeline | null, activeEra: EraIndex, era: EraIndex): number | null => {
  if (!timeline || timeline.eraDurationMs < DAY_MS) return null;

  return timeline.startMs - (activeEra - era) * timeline.eraDurationMs;
};
