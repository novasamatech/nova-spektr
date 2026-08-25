import { getErasInDays } from '@/domains/staking';

/** Windows the rewards drill-down can be looked at through. */
export const REWARD_PERIODS = ['7d', '30d', 'all', 'custom'] as const;

export type RewardPeriod = (typeof REWARD_PERIODS)[number];

export const DEFAULT_REWARD_PERIOD: RewardPeriod = '30d';

/**
 * Inclusive day bounds, local time. Structurally the shape `react-day-picker`
 * reports (`from` present but possibly undefined, `to` optional), kept as a
 * local type so the date math here does not depend on the picker.
 */
export type RewardDateRange = { from: Date | undefined; to?: Date };

/**
 * A period plus, for `custom`, the dates behind it.
 *
 * The two travel together because every consumer needs both: the tab decides
 * how the window is described, the range decides where it starts and ends, and
 * a `custom` period with no range yet is a real state — the picker is open and
 * nothing has been chosen.
 */
export type RewardWindow = {
  period: RewardPeriod;
  /**
   * Only meaningful for `custom`, and half-filled while the user is still
   * picking — the picker reports the first click as `{ from }` alone.
   */
  range: RewardDateRange | null;
};

export const DEFAULT_REWARD_WINDOW: RewardWindow = { period: DEFAULT_REWARD_PERIOD, range: null };

const DAYS_BY_PERIOD: Record<RewardPeriod, number | null> = { '7d': 7, '30d': 30, all: null, custom: null };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days the period covers, `null` for "everything there is". */
export function periodDays(period: RewardPeriod): number | null {
  return DAYS_BY_PERIOD[period];
}

function isCustom(rewardWindow: RewardWindow): boolean {
  return rewardWindow.period === 'custom';
}

/** The range behind a custom window; empty for presets and before a pick. */
function customRange(rewardWindow: RewardWindow): Partial<RewardDateRange> {
  return isCustom(rewardWindow) ? (rewardWindow.range ?? {}) : {};
}

/**
 * Unix **seconds** the window covers — the unit the indexer stamps payouts with
 * — both bounds inclusive of the whole day the user picked: someone asking for
 * "1 Jul – 31 Jul" means the 31st, not the instant it began.
 *
 * `null` bounds mean "unbounded that way", which is what `all` is, and what a
 * half-picked custom range is until its other end lands.
 */
export function windowBounds(rewardWindow: RewardWindow, now = new Date()): { from: number | null; to: number | null } {
  if (isCustom(rewardWindow)) {
    const { from, to } = customRange(rewardWindow);

    return {
      from: from ? Math.floor(startOfDayMs(from) / 1000) : null,
      to: to ? Math.floor(endOfDayMs(to) / 1000) : null,
    };
  }

  const start = periodStart(rewardWindow.period, now);

  return { from: start ?? null, to: null };
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * The last millisecond of the local day. Taken from the next midnight rather
 * than `start + 24h`: a day that changes the clocks is 23 or 25 hours long.
 */
function endOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - 1;
}

/** Whether the window is fully specified — a half-picked range is not. */
export function isWindowReady(rewardWindow: RewardWindow): boolean {
  const { from, to } = customRange(rewardWindow);

  return !isCustom(rewardWindow) || Boolean(from && to);
}

/**
 * A custom window still waiting for its dates. The drill-down reports nothing
 * for it — falling back to "all time" would answer a question nobody asked.
 */
export function isCustomWindowPending(rewardWindow: RewardWindow): boolean {
  return isCustom(rewardWindow) && !isWindowReady(rewardWindow);
}

/**
 * Short label for a file name: `30d`, `all`, or
 * `from-2026-07-01-to-2026-07-31`. Spelled with words rather than a symbol
 * between the days because the file name folds every non-alphanumeric into `-`
 * and three dates in a row do not read.
 */
export function windowSlug(rewardWindow: RewardWindow): string {
  if (!isCustom(rewardWindow)) return rewardWindow.period;

  const { from, to } = customRange(rewardWindow);
  if (!from || !to) return 'custom';

  return `from-${toIsoDay(from)}-to-${toIsoDay(to)}`;
}

function toIsoDay(date: Date): string {
  // Built from the local parts on purpose: `toISOString` would shift the day
  // for anyone east or west of UTC, and the name has to match the days the
  // picker showed.
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
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
 *
 * A custom range is counted from **now** back to its start — eras are numbered
 * from the active one, so a July window looked at in September reaches back
 * over the eras since July. `windowEraRange` trims the ones after its end off
 * again.
 */
export function erasInWindow(
  rewardWindow: RewardWindow,
  eraDurationMs: number | null,
  historyDepth: number,
  now = Date.now(),
): number {
  if (!eraDurationMs || eraDurationMs <= 0) return historyDepth;

  if (isCustom(rewardWindow)) {
    const { from } = customRange(rewardWindow);
    if (!from) return historyDepth;

    const span = Math.max(DAY_MS, now - startOfDayMs(from));

    return Math.min(historyDepth, Math.max(1, Math.ceil(span / eraDurationMs)));
  }

  const days = periodDays(rewardWindow.period);
  if (days === null) return historyDepth;

  return Math.min(historyDepth, getErasInDays(days, eraDurationMs));
}

/** The eras a window is attributed over — both bounds inclusive. */
export type EraRange = { eraFrom: number; eraTo: number };

type ChainEraFacts = {
  activeEra: number;
  eraDurationMs: number | null;
  historyDepth: number;
};

/**
 * The closed eras of a chain that fall inside the window, `null` when none does
 * — or when the window is a custom range still waiting for its dates, since
 * nothing is fetched or reported until both ends land.
 *
 * The active era is never part of it: it has not paid anything yet, so its
 * arithmetic is not final. A preset therefore ends at the last closed era and
 * reaches back `erasInWindow`; a custom range is trimmed on **both** sides —
 * 1–31 Jul looked at on 22 Aug must not carry August's eras into a figure
 * captioned "over the period". Era boundaries are only known to the day, so an
 * era straddling either end is kept rather than dropped.
 */
export function windowEraRange(rewardWindow: RewardWindow, chain: ChainEraFacts, now = Date.now()): EraRange | null {
  if (!isWindowReady(rewardWindow)) return null;

  const { activeEra, eraDurationMs, historyDepth } = chain;
  const lastClosed = activeEra - 1;

  const eraFrom = Math.max(0, lastClosed - erasInWindow(rewardWindow, eraDurationMs, historyDepth, now) + 1);
  const eraTo = lastClosed - erasSinceWindowEnd(rewardWindow, eraDurationMs, now);

  return eraTo < eraFrom ? null : { eraFrom, eraTo };
}

/**
 * How many closed eras lie wholly after the window — the ones that closed
 * between its end and now. Zero for every window that reaches now, which is
 * every preset and a custom range whose end is today or still unpicked.
 */
function erasSinceWindowEnd(rewardWindow: RewardWindow, eraDurationMs: number | null, now: number): number {
  if (!eraDurationMs || eraDurationMs <= 0) return 0;

  const { to } = customRange(rewardWindow);
  if (!to) return 0;

  // The first instant after the last picked day — when the window closed.
  const elapsed = now - (endOfDayMs(to) + 1);
  if (elapsed <= 0) return 0;

  // The era the end falls into may still hold the window's last hours; only
  // the eras entirely past it are dropped.
  return Math.max(0, Math.ceil(elapsed / eraDurationMs) - 1);
}
