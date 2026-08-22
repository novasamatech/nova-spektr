import { type DateRange } from '@/shared/ui-kit';
import { getErasInDays } from '@/domains/staking';

/** Windows the rewards drill-down can be looked at through. */
export const REWARD_PERIODS = ['7d', '30d', 'all', 'custom'] as const;

export type RewardPeriod = (typeof REWARD_PERIODS)[number];

export const DEFAULT_REWARD_PERIOD: RewardPeriod = '30d';

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
   * Inclusive day bounds, local time. Only meaningful for `custom`, and
   * half-filled while the user is still picking — `react-day-picker` reports
   * the first click as `{ from }` alone.
   */
  range: DateRange | null;
};

export const DEFAULT_REWARD_WINDOW: RewardWindow = { period: DEFAULT_REWARD_PERIOD, range: null };

const DAYS_BY_PERIOD: Record<RewardPeriod, number | null> = { '7d': 7, '30d': 30, all: null, custom: null };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days the period covers, `null` for "everything there is". */
export function periodDays(period: RewardPeriod): number | null {
  return DAYS_BY_PERIOD[period];
}

/**
 * Unix **seconds** the window covers — the unit the indexer stamps payouts with
 * — both bounds inclusive of the whole day the user picked: someone asking for
 * "1 Jul – 31 Jul" means the 31st, not the instant it began.
 *
 * `null` bounds mean "unbounded that way", which is what `all` is, and what a
 * half-picked custom range is until its other end lands.
 */
export function windowBounds(window: RewardWindow, now = new Date()): { from: number | null; to: number | null } {
  if (window.period === 'custom') {
    const { from, to } = window.range ?? {};

    return {
      from: from ? Math.floor(startOfDayMs(from) / 1000) : null,
      to: to ? Math.floor((startOfDayMs(to) + DAY_MS - 1) / 1000) : null,
    };
  }

  const start = periodStart(window.period, now);

  return { from: start ?? null, to: null };
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Days the window spans, used to annualise what it earned. A custom range
 * counts both end days, so 1 Jul – 31 Jul is 31 days rather than 30.
 */
export function windowDays(window: RewardWindow): number | null {
  if (window.period !== 'custom') return periodDays(window.period);

  const { from, to } = window.range ?? {};
  if (!from || !to) return null;

  return Math.max(1, Math.round((startOfDayMs(to) - startOfDayMs(from)) / DAY_MS) + 1);
}

/** Whether the window is fully specified — a half-picked range is not. */
export function isWindowReady(window: RewardWindow): boolean {
  return window.period !== 'custom' || Boolean(window.range?.from && window.range.to);
}

/** Short label for a file name: `30d`, `all`, or `2026-07-01_2026-07-31`. */
export function windowSlug(window: RewardWindow): string {
  if (window.period !== 'custom') return window.period;

  const { from, to } = window.range ?? {};
  if (!from || !to) return 'custom';

  return `${toIsoDay(from)}_${toIsoDay(to)}`;
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
 */
export function erasInPeriod(period: RewardPeriod, eraDurationMs: number | null, historyDepth: number): number {
  return erasInWindow({ period, range: null }, eraDurationMs, historyDepth);
}

/**
 * Same, for a window that may be a custom range.
 *
 * Counted from **now** back to the range's start — eras are numbered from the
 * active one, so a July window looked at in September reaches back over the
 * eras since July. `windowEraRange` trims the ones after its end off again.
 */
export function erasInWindow(
  window: RewardWindow,
  eraDurationMs: number | null,
  historyDepth: number,
  now = Date.now(),
): number {
  if (!eraDurationMs || eraDurationMs <= 0) return historyDepth;

  if (window.period === 'custom') {
    const from = window.range?.from;
    if (!from) return historyDepth;

    const span = Math.max(DAY_MS, now - startOfDayMs(from));

    return Math.min(historyDepth, Math.max(1, Math.ceil(span / eraDurationMs)));
  }

  const days = periodDays(window.period);
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
 * The closed eras of a chain that fall inside the window, `null` when none
 * does.
 *
 * The active era is never part of it: it has not paid anything yet, so its
 * arithmetic is not final. A preset therefore ends at the last closed era and
 * reaches back `erasInWindow`; a custom range is trimmed on **both** sides —
 * 1–31 Jul looked at on 22 Aug must not carry August's eras into a figure
 * captioned "over the period". Era boundaries are only known to the day, so an
 * era straddling either end is kept rather than dropped.
 */
export function windowEraRange(window: RewardWindow, chain: ChainEraFacts, now = Date.now()): EraRange | null {
  const { activeEra, eraDurationMs, historyDepth } = chain;
  const lastClosed = activeEra - 1;

  const eraFrom = Math.max(0, lastClosed - erasInWindow(window, eraDurationMs, historyDepth, now) + 1);
  const eraTo = lastClosed - erasSinceWindowEnd(window, eraDurationMs, now);

  return eraTo < eraFrom ? null : { eraFrom, eraTo };
}

/**
 * How many closed eras lie wholly after the window — the ones that closed
 * between its end and now. Zero for every window that reaches now, which is
 * every preset and a custom range whose end is today or still unpicked.
 */
function erasSinceWindowEnd(window: RewardWindow, eraDurationMs: number | null, now: number): number {
  if (window.period !== 'custom' || !eraDurationMs || eraDurationMs <= 0) return 0;

  const to = window.range?.to;
  if (!to) return 0;

  // The day after the last picked one, at midnight — the instant the window closed.
  const elapsed = now - (startOfDayMs(to) + DAY_MS);
  if (elapsed <= 0) return 0;

  // The era the end falls into may still hold the window's last hours; only
  // the eras entirely past it are dropped.
  return Math.max(0, Math.ceil(elapsed / eraDurationMs) - 1);
}
