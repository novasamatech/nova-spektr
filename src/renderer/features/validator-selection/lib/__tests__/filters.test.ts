import { describe, expect, it } from 'vitest';

import { type IdentityParentMap } from '@/domains/staking';
import { DEFAULT_FILTERS } from '../constants';
import { applyFilters, filtersDiffer, hasOnChainIdentity } from '../filters';
import { type FiltersState } from '../types';

import { accountId, ids, makeValidator } from './testUtils';

/** Everything off - each test switches on exactly the one bound it exercises. */
const OPEN_FILTERS: FiltersState = {
  minApy: null,
  maxCommission: null,
  minOwnStake: null,
  hideOversubscribed: false,
  hideIdle: false,
  hasIdentity: false,
  neverSlashed: false,
};

const identityParents: IdentityParentMap = {
  [accountId(1)]: accountId(1),
  [accountId(2)]: accountId(1),
  [accountId(4)]: null,
};

const withFilters = (patch: Partial<FiltersState>): FiltersState => ({ ...OPEN_FILTERS, ...patch });

describe('hasOnChainIdentity', () => {
  it('is true only for a validator carrying a cluster key', () => {
    expect(hasOnChainIdentity(accountId(1), identityParents)).toBe(true);
    expect(hasOnChainIdentity(accountId(4), identityParents)).toBe(false);
    expect(hasOnChainIdentity(accountId(9), identityParents)).toBe(false);
  });
});

describe('applyFilters', () => {
  it('keeps everything when no bound is set', () => {
    const validators = [makeValidator(1, { slashed: true, oversubscribed: true, blocksAuthored: 0, apy: null })];

    expect(applyFilters(validators, OPEN_FILTERS, identityParents)).toEqual(validators);
  });

  it('applies the minimum apy inclusively and drops unknown apy', () => {
    const validators = [
      makeValidator(1, { apy: 15 }),
      makeValidator(2, { apy: 10 }),
      makeValidator(3, { apy: 9.9 }),
      makeValidator(4, { apy: null }),
    ];

    const result = applyFilters(validators, withFilters({ minApy: 10 }), identityParents);

    expect(ids(result)).toEqual([accountId(1), accountId(2)]);
  });

  it('applies the maximum commission inclusively', () => {
    const validators = [
      makeValidator(1, { commission: 0 }),
      makeValidator(2, { commission: 5 }),
      makeValidator(3, { commission: 5.1 }),
    ];

    const result = applyFilters(validators, withFilters({ maxCommission: 5 }), identityParents);

    expect(ids(result)).toEqual([accountId(1), accountId(2)]);
  });

  it('compares the minimum own stake with BN', () => {
    const validators = [
      makeValidator(1, { ownStake: '90071992547409910000000000' }),
      makeValidator(2, { ownStake: '90071992547409909999999999' }),
    ];

    const result = applyFilters(
      validators,
      withFilters({ minOwnStake: '90071992547409910000000000' }),
      identityParents,
    );

    expect(ids(result)).toEqual([accountId(1)]);
  });

  it('hides oversubscribed validators', () => {
    const validators = [makeValidator(1, { oversubscribed: true }), makeValidator(2)];

    expect(ids(applyFilters(validators, withFilters({ hideOversubscribed: true }), identityParents))).toEqual([
      accountId(2),
    ]);
  });

  it('hides validators that authored zero blocks, but keeps unknown block counts', () => {
    const validators = [
      makeValidator(1, { blocksAuthored: 0 }),
      makeValidator(2, { blocksAuthored: null }),
      makeValidator(3, { blocksAuthored: 4 }),
    ];

    expect(ids(applyFilters(validators, withFilters({ hideIdle: true }), identityParents))).toEqual([
      accountId(2),
      accountId(3),
    ]);
  });

  it('keeps only validators with an on-chain identity', () => {
    const validators = [makeValidator(1), makeValidator(4), makeValidator(9)];

    expect(ids(applyFilters(validators, withFilters({ hasIdentity: true }), identityParents))).toEqual([accountId(1)]);
  });

  it('drops slashed validators', () => {
    const validators = [makeValidator(1, { slashed: true }), makeValidator(2)];

    expect(ids(applyFilters(validators, withFilters({ neverSlashed: true }), identityParents))).toEqual([accountId(2)]);
  });

  it('combines every bound', () => {
    const validators = [
      // survives everything
      makeValidator(1, { apy: 20, commission: 2, ownStake: '500', blocksAuthored: 3 }),
      // no identity
      makeValidator(4, { apy: 20, commission: 2, ownStake: '500', blocksAuthored: 3 }),
      // apy too low
      makeValidator(2, { apy: 4, commission: 2, ownStake: '500', blocksAuthored: 3 }),
      // slashed
      makeValidator(2, { apy: 20, commission: 2, ownStake: '500', blocksAuthored: 3, slashed: true }),
    ];

    const result = applyFilters(
      validators,
      {
        minApy: 10,
        maxCommission: 5,
        minOwnStake: '100',
        hideOversubscribed: true,
        hideIdle: true,
        hasIdentity: true,
        neverSlashed: true,
      },
      identityParents,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.accountId).toBe(accountId(1));
  });

  it('drops everything with no identity map at all when identity is required', () => {
    const validators = [makeValidator(1), makeValidator(2)];

    expect(applyFilters(validators, withFilters({ hasIdentity: true }))).toEqual([]);
  });
});

describe('filtersDiffer', () => {
  it('is false for the defaults', () => {
    expect(filtersDiffer(DEFAULT_FILTERS)).toBe(false);
    expect(filtersDiffer({ ...DEFAULT_FILTERS })).toBe(false);
  });

  it('is true for any single change, including switching a default-on toggle off', () => {
    const patches: Partial<FiltersState>[] = [
      { minApy: 0 },
      { maxCommission: 100 },
      { minOwnStake: '0' },
      { hideOversubscribed: true },
      { hideIdle: true },
      { hasIdentity: false },
      { neverSlashed: false },
    ];

    for (const patch of patches) {
      expect(filtersDiffer({ ...DEFAULT_FILTERS, ...patch })).toBe(true);
    }
  });
});
