import { describe, expect, it } from 'vitest';

import {
  averageApy,
  calculateExpiryDays,
  calculateSharePercent,
  comparePlanck,
  getExpiryUrgency,
  sortByStake,
} from '../position-metrics';

// 10 DOT already exceeds Number.MAX_SAFE_INTEGER once expressed in planck.
const TEN_DOT = '100000000000';
const HUGE = '9007199254740993000000000';
const HUGE_PLUS_ONE = '9007199254740993000000001';

describe('comparePlanck', () => {
  it('distinguishes amounts that collapse into the same Number', () => {
    expect(Number(HUGE)).toEqual(Number(HUGE_PLUS_ONE));
    expect(comparePlanck(HUGE_PLUS_ONE, HUGE)).toBeGreaterThan(0);
    expect(comparePlanck(HUGE, HUGE_PLUS_ONE)).toBeLessThan(0);
    expect(comparePlanck(HUGE, HUGE)).toEqual(0);
  });
});

describe('sortByStake', () => {
  const rows = [
    { id: 'small', stake: TEN_DOT },
    { id: 'huge', stake: HUGE },
    { id: 'hugest', stake: HUGE_PLUS_ONE },
    { id: 'zero', stake: '0' },
  ];

  it('orders descending by default, beyond Number precision', () => {
    expect(sortByStake(rows, (row) => row.stake).map((row) => row.id)).toEqual(['hugest', 'huge', 'small', 'zero']);
  });

  it('orders ascending on request', () => {
    expect(sortByStake(rows, (row) => row.stake, 'asc').map((row) => row.id)).toEqual([
      'zero',
      'small',
      'huge',
      'hugest',
    ]);
  });

  it('does not mutate the input', () => {
    const input = [...rows];
    sortByStake(input, (row) => row.stake);

    expect(input.map((row) => row.id)).toEqual(['small', 'huge', 'hugest', 'zero']);
  });
});

describe('calculateSharePercent', () => {
  it('computes a plain share', () => {
    expect(calculateSharePercent('25', '100')).toEqual(25);
    expect(calculateSharePercent('1', '3')).toBeCloseTo(33.3333, 3);
  });

  it('stays exact for planck amounts no Number can hold', () => {
    const total = '30000000000000000000000000';
    const part = '10000000000000000000000000';

    expect(calculateSharePercent(part, total)).toBeCloseTo(33.3333, 3);
  });

  it('returns 0 when the total is zero rather than dividing by it', () => {
    expect(calculateSharePercent('100', '0')).toEqual(0);
  });

  it('returns 100 for the only position on a chain', () => {
    expect(calculateSharePercent(HUGE, HUGE)).toEqual(100);
  });
});

describe('averageApy', () => {
  it('ignores validators with no reported APY', () => {
    expect(averageApy([10, null, 20, undefined])).toEqual(15);
  });

  it('is null when nothing carries an APY', () => {
    expect(averageApy([null, undefined])).toBeNull();
    expect(averageApy([])).toBeNull();
  });
});

describe('getExpiryUrgency', () => {
  it('is critical below 14 days', () => {
    expect(getExpiryUrgency(0)).toEqual('critical');
    expect(getExpiryUrgency(13.9)).toEqual('critical');
  });

  it('is a warning from 14 through 30 days', () => {
    expect(getExpiryUrgency(14)).toEqual('warning');
    expect(getExpiryUrgency(30)).toEqual('warning');
  });

  it('is safe past 30 days', () => {
    expect(getExpiryUrgency(30.1)).toEqual('safe');
    expect(getExpiryUrgency(84)).toEqual('safe');
  });
});

describe('calculateExpiryDays', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('counts the eras left before the oldest payout leaves history', () => {
    expect(calculateExpiryDays({ oldestEra: 100, activeEra: 150, historyDepth: 84, eraDurationMs: DAY })).toEqual(34);
  });

  it('scales with a shorter era', () => {
    expect(calculateExpiryDays({ oldestEra: 100, activeEra: 150, historyDepth: 84, eraDurationMs: DAY / 4 })).toEqual(
      8.5,
    );
  });

  it('is zero once the payout is already out of range', () => {
    expect(calculateExpiryDays({ oldestEra: 10, activeEra: 150, historyDepth: 84, eraDurationMs: DAY })).toEqual(0);
  });

  it('is null when the era timing is unknown', () => {
    expect(calculateExpiryDays({ oldestEra: 100, activeEra: 150, historyDepth: 84, eraDurationMs: 0 })).toBeNull();
    expect(calculateExpiryDays({ oldestEra: 100, activeEra: 150, historyDepth: 0, eraDurationMs: DAY })).toBeNull();
  });
});
