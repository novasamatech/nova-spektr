import { describe, expect, it } from 'vitest';

import { getDisplayedLabel, sortValidators } from '../sorting';
import { type DisplayedStrings } from '../types';

import { accountId, ids, makeValidator } from './testUtils';

// Well past Number.MAX_SAFE_INTEGER (9_007_199_254_740_991) and differing only in
// the last digits - read as floats these three collapse into the same value.
const HUGE_A = '90071992547409910000000001';
const HUGE_B = '90071992547409910000000003';
const HUGE_C = '90071992547409910000000002';

const displayed: DisplayedStrings = {
  names: { [accountId(1)]: 'Zeta', [accountId(2)]: 'alpha' },
  addresses: { [accountId(1)]: '1address', [accountId(2)]: '2address', [accountId(3)]: '3address' },
};

describe('getDisplayedLabel', () => {
  it('prefers the resolved identity name', () => {
    expect(getDisplayedLabel(accountId(1), displayed)).toBe('Zeta');
  });

  it('falls back to the displayed address when there is no identity', () => {
    expect(getDisplayedLabel(accountId(3), displayed)).toBe('3address');
  });

  it('falls back to the account id when nothing is displayed', () => {
    expect(getDisplayedLabel(accountId(9), displayed)).toBe(accountId(9));
  });
});

describe('sortValidators', () => {
  it('sorts by apy descending by default and keeps unknown apy last', () => {
    const validators = [
      makeValidator(1, { apy: 5 }),
      makeValidator(2, { apy: null }),
      makeValidator(3, { apy: 20 }),
      makeValidator(4, { apy: 12 }),
    ];

    const sorted = sortValidators(validators, { column: 'apy', direction: 'desc' });

    expect(ids(sorted)).toEqual([accountId(3), accountId(4), accountId(1), accountId(2)]);
  });

  it('keeps unknown apy last in ascending order too', () => {
    const validators = [makeValidator(1, { apy: null }), makeValidator(2, { apy: 20 }), makeValidator(3, { apy: 5 })];

    const sorted = sortValidators(validators, { column: 'apy', direction: 'asc' });

    expect(ids(sorted)).toEqual([accountId(3), accountId(2), accountId(1)]);
  });

  it('keeps unknown block counts last in both directions', () => {
    const validators = [
      makeValidator(1, { blocksAuthored: null }),
      makeValidator(2, { blocksAuthored: 7 }),
      makeValidator(3, { blocksAuthored: 0 }),
    ];

    expect(ids(sortValidators(validators, { column: 'blocks', direction: 'desc' }))).toEqual([
      accountId(2),
      accountId(3),
      accountId(1),
    ]);
    expect(ids(sortValidators(validators, { column: 'blocks', direction: 'asc' }))).toEqual([
      accountId(3),
      accountId(2),
      accountId(1),
    ]);
  });

  it('compares own stake with BN, not with Number', () => {
    const validators = [
      makeValidator(1, { ownStake: HUGE_A }),
      makeValidator(2, { ownStake: HUGE_B }),
      makeValidator(3, { ownStake: HUGE_C }),
    ];

    // Float comparison would report all three equal and leave the input order.
    expect(ids(sortValidators(validators, { column: 'ownStake', direction: 'desc' }))).toEqual([
      accountId(2),
      accountId(3),
      accountId(1),
    ]);
    expect(ids(sortValidators(validators, { column: 'ownStake', direction: 'asc' }))).toEqual([
      accountId(1),
      accountId(3),
      accountId(2),
    ]);
  });

  it('treats an unparsable stake as zero instead of throwing', () => {
    const validators = [makeValidator(1, { ownStake: 'not-a-number' }), makeValidator(2, { ownStake: '5' })];

    expect(ids(sortValidators(validators, { column: 'ownStake', direction: 'desc' }))).toEqual([
      accountId(2),
      accountId(1),
    ]);
  });

  it('sorts the validator column by the displayed label, not by the account id', () => {
    // Account id order is 1, 2, 3 - displayed labels order them alpha, Zeta, 3address.
    const validators = [makeValidator(1), makeValidator(2), makeValidator(3)];

    const sorted = sortValidators(validators, { column: 'validator', direction: 'asc' }, displayed);

    expect(ids(sorted)).toEqual([accountId(3), accountId(2), accountId(1)]);
  });

  it('sorts era points, nominators and commission', () => {
    const validators = [
      makeValidator(1, { eraPoints: 10, nominatorCount: 300, commission: 9 }),
      makeValidator(2, { eraPoints: 90, nominatorCount: 100, commission: 1 }),
      makeValidator(3, { eraPoints: 50, nominatorCount: 200, commission: 5 }),
    ];

    expect(ids(sortValidators(validators, { column: 'eraPoints', direction: 'desc' }))).toEqual([
      accountId(2),
      accountId(3),
      accountId(1),
    ]);
    expect(ids(sortValidators(validators, { column: 'nominators', direction: 'asc' }))).toEqual([
      accountId(2),
      accountId(3),
      accountId(1),
    ]);
    expect(ids(sortValidators(validators, { column: 'commission', direction: 'asc' }))).toEqual([
      accountId(2),
      accountId(3),
      accountId(1),
    ]);
  });

  it('keeps the incoming order for ties', () => {
    const validators = [makeValidator(3, { apy: 10 }), makeValidator(1, { apy: 10 }), makeValidator(2, { apy: 10 })];

    expect(ids(sortValidators(validators, { column: 'apy', direction: 'desc' }))).toEqual([
      accountId(3),
      accountId(1),
      accountId(2),
    ]);
    expect(ids(sortValidators(validators, { column: 'apy', direction: 'asc' }))).toEqual([
      accountId(3),
      accountId(1),
      accountId(2),
    ]);
  });

  it('does not mutate the input list', () => {
    const validators = [makeValidator(1, { apy: 5 }), makeValidator(2, { apy: 20 })];

    sortValidators(validators, { column: 'apy', direction: 'desc' });

    expect(ids(validators)).toEqual([accountId(1), accountId(2)]);
  });
});
