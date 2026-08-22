import { describe, expect, it } from 'vitest';

import { type RewardWindow, erasInPeriod, periodStart, windowEraRange } from '../reward-period';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DEPTH = 84;

// Local-time days, the way the picker hands them over.
const JULY_1 = new Date(2026, 6, 1);
const JULY_31 = new Date(2026, 6, 31);
const AUGUST_20 = new Date(2026, 7, 20);
const AUGUST_21 = new Date(2026, 7, 21);
const AUGUST_22 = new Date(2026, 7, 22);

/** Looked at on 22 Aug at noon, local time. */
const NOW = new Date(2026, 7, 22, 12).getTime();

const july: RewardWindow = { period: 'custom', range: { from: JULY_1, to: JULY_31 } };
const preset = (period: RewardWindow['period']): RewardWindow => ({ period, range: null });

const polkadot = { activeEra: 100, eraDurationMs: DAY_MS, historyDepth: HISTORY_DEPTH };
const kusama = { activeEra: 1000, eraDurationMs: DAY_MS / 4, historyDepth: HISTORY_DEPTH };

describe('periodStart', () => {
  it('anchors to UTC midnight so the key does not move with the clock', () => {
    const morning = periodStart('7d', new Date('2026-07-31T06:15:00Z'));
    const evening = periodStart('7d', new Date('2026-07-31T23:59:00Z'));

    expect(morning).toBe(evening);
  });

  it('covers the requested number of days, today included', () => {
    const start = periodStart('7d', new Date('2026-07-31T12:00:00Z'))!;

    expect(new Date(start * 1000).toISOString()).toBe('2026-07-25T00:00:00.000Z');
  });

  it('has no lower bound for all time', () => {
    expect(periodStart('all')).toBeUndefined();
  });
});

describe('erasInPeriod', () => {
  it('counts a day per era on Polkadot', () => {
    expect(erasInPeriod('7d', DAY_MS, HISTORY_DEPTH)).toBe(7);
    expect(erasInPeriod('30d', DAY_MS, HISTORY_DEPTH)).toBe(30);
  });

  it('counts four eras a day on Kusama', () => {
    expect(erasInPeriod('7d', DAY_MS / 4, HISTORY_DEPTH)).toBe(28);
  });

  it('never asks for more history than the chain keeps', () => {
    // 30 Kusama days would be 120 eras; nothing older than the depth is on
    // chain to attribute a reward to.
    expect(erasInPeriod('30d', DAY_MS / 4, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
    expect(erasInPeriod('all', DAY_MS, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
  });

  it('falls back to the full depth when the era duration is unknown', () => {
    expect(erasInPeriod('7d', null, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
  });
});

describe('windowEraRange', () => {
  it('ends a preset at the last closed era and reaches back the period', () => {
    // The active era has not paid anything yet, so 99 is the newest era that counts.
    expect(windowEraRange(preset('7d'), polkadot, NOW)).toEqual({ eraFrom: 93, eraTo: 99 });
    expect(windowEraRange(preset('all'), polkadot, NOW)).toEqual({ eraFrom: 16, eraTo: 99 });
  });

  it('never reaches below era zero', () => {
    expect(windowEraRange(preset('all'), { ...polkadot, activeEra: 10 }, NOW)).toEqual({ eraFrom: 0, eraTo: 9 });
  });

  it('stops a past custom window at the eras that closed inside it', () => {
    // 1–31 Jul looked at on 22 Aug: the 21 full days of August that have
    // elapsed since the window ended are not part of it. The era straddling
    // each end is kept — era boundaries are only known to the day.
    expect(windowEraRange(july, polkadot, NOW)).toEqual({ eraFrom: 47, eraTo: 78 });
  });

  it('runs a window that reaches today up to the last closed era', () => {
    const thisWeek: RewardWindow = { period: 'custom', range: { from: AUGUST_20, to: AUGUST_22 } };

    expect(windowEraRange(thisWeek, polkadot, NOW)).toEqual({ eraFrom: 97, eraTo: 99 });
  });

  it('drops the eras of today from a window that ended yesterday on a four-era day', () => {
    const untilYesterday: RewardWindow = { period: 'custom', range: { from: AUGUST_20, to: AUGUST_21 } };

    // Noon is two Kusama eras into the day; the second one is wholly today.
    expect(windowEraRange(untilYesterday, kusama, NOW)).toEqual({ eraFrom: 990, eraTo: 998 });
  });

  it('keeps a half-picked range open-ended on the missing side', () => {
    const fromJuly: RewardWindow = { period: 'custom', range: { from: JULY_1, to: undefined } };
    const empty: RewardWindow = { period: 'custom', range: null };

    expect(windowEraRange(fromJuly, polkadot, NOW)).toEqual({ eraFrom: 47, eraTo: 99 });
    expect(windowEraRange(empty, polkadot, NOW)).toEqual({ eraFrom: 16, eraTo: 99 });
  });

  it('has no eras for a window older than the history the chain keeps', () => {
    // 84 Kusama eras are 21 days; July is gone from the chain by 22 Aug.
    expect(windowEraRange(july, kusama, NOW)).toBeNull();
  });

  it('has no eras before the first one closes', () => {
    expect(windowEraRange(preset('7d'), { ...polkadot, activeEra: 0 }, NOW)).toBeNull();
  });

  it('falls back to the whole depth when the era duration is unknown', () => {
    expect(windowEraRange(july, { ...polkadot, eraDurationMs: null }, NOW)).toEqual({ eraFrom: 16, eraTo: 99 });
  });
});
