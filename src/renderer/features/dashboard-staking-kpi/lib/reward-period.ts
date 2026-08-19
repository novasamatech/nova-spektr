import { getErasInDays } from '@/domains/staking';

/** Windows the rewards drill-down can be looked at through. */
export const REWARD_PERIODS = ['7d', '30d', 'all'] as const;

export type RewardPeriod = (typeof REWARD_PERIODS)[number];

export const DEFAULT_REWARD_PERIOD: RewardPeriod = '30d';

const DAYS_BY_PERIOD: Record<RewardPeriod, number | null> = { '7d': 7, '30d': 30, all: null };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days the period covers, `null` for "everything there is". */
export function periodDays(period: RewardPeriod): number | null {
  return DAYS_BY_PERIOD[period];
}

/**
 * Unix **seconds** the window starts at, anchored to UTC midnight rather than
 * to "now" — a window that slides with the clock changes its cache key on every
 * render and refetches the same days over and over.
 *
 * `undefined` for "all", which is what the indexer query means by no bound.
 */
export function periodStart(period: RewardPeriod, now = new Date()): number | undefined {
  const days = periodDays(period);
  if (days === null) return undefined;

  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Math.floor((midnight - (days - 1) * DAY_MS) / 1000);
}

/**
 * How many eras back the window reaches on a chain.
 *
 * Eras are not days — Polkadot pays one a day, Kusama four — so the count comes
 * from the chain's own era duration. Capped by `historyDepth`: nothing older is
 * on chain to attribute a reward to, and asking for it costs an indexer page
 * walk that can only come back empty.
 */
export function erasInPeriod(period: RewardPeriod, eraDurationMs: number | null, historyDepth: number): number {
  const days = periodDays(period);
  if (days === null || !eraDurationMs || eraDurationMs <= 0) return historyDepth;

  return Math.min(historyDepth, getErasInDays(days, eraDurationMs));
}
