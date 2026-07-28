import { describe, expect, it } from 'vitest';

import { type IdentityParentMap } from '@/domains/staking';
import { getClusterPositions, getValidatorFlag } from '../flags';

import { accountId, makeValidator } from './testUtils';

describe('getValidatorFlag', () => {
  it('returns no flag for a plain, identified validator', () => {
    expect(getValidatorFlag(makeValidator(1), 1)).toBeNull();
    expect(getValidatorFlag(makeValidator(1), 2)).toBeNull();
  });

  it('flags the third and later validator of a cluster', () => {
    expect(getValidatorFlag(makeValidator(1), 3)).toBe('cluster');
    expect(getValidatorFlag(makeValidator(1), 7)).toBe('cluster');
  });

  it('flags a validator with no cluster as having no identity', () => {
    expect(getValidatorFlag(makeValidator(1))).toBe('noIdentity');
    expect(getValidatorFlag(makeValidator(1), 0)).toBe('noIdentity');
  });

  it('follows the precedence blocked > slashed > cluster > noIdentity', () => {
    const everything = { blocked: true, slashed: true };

    expect(getValidatorFlag(makeValidator(1, everything), 5)).toBe('blocked');
    expect(getValidatorFlag(makeValidator(1, { ...everything, blocked: false }), 5)).toBe('slashed');
    expect(getValidatorFlag(makeValidator(1), 5)).toBe('cluster');
  });
});

describe('getClusterPositions', () => {
  // One operator running three validators, plus two with no identity at all.
  const identityParents: IdentityParentMap = {
    [accountId(1)]: accountId(1),
    [accountId(2)]: accountId(1),
    [accountId(3)]: accountId(1),
    [accountId(4)]: null,
  };

  it('numbers cluster members 1-based in the given order', () => {
    const sorted = [makeValidator(1), makeValidator(2), makeValidator(3)];

    expect(getClusterPositions(sorted, identityParents)).toEqual({
      [accountId(1)]: 1,
      [accountId(2)]: 2,
      [accountId(3)]: 3,
    });
  });

  it('follows the given order rather than the account id order', () => {
    const sorted = [makeValidator(3), makeValidator(1), makeValidator(2)];

    expect(getClusterPositions(sorted, identityParents)).toEqual({
      [accountId(3)]: 1,
      [accountId(1)]: 2,
      [accountId(2)]: 3,
    });
  });

  it('numbers separate clusters independently', () => {
    const parents: IdentityParentMap = {
      [accountId(1)]: accountId(1),
      [accountId(2)]: accountId(2),
      [accountId(3)]: accountId(1),
    };

    expect(getClusterPositions([makeValidator(1), makeValidator(2), makeValidator(3)], parents)).toEqual({
      [accountId(1)]: 1,
      [accountId(2)]: 1,
      [accountId(3)]: 2,
    });
  });

  it('gives no position to validators without a cluster', () => {
    const sorted = [makeValidator(4), makeValidator(5)];

    expect(getClusterPositions(sorted, identityParents)).toEqual({});
  });

  it('returns an empty map with no identities at all', () => {
    expect(getClusterPositions([makeValidator(1), makeValidator(2)], {})).toEqual({});
  });
});
