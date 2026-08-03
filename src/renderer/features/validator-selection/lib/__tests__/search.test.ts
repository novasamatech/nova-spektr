import { describe, expect, it } from 'vitest';

import { searchValidators } from '../search';
import { type DisplayedStrings } from '../types';

import { accountId, ids, makeValidator } from './testUtils';

const ADDRESS_ONE = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5';
const ADDRESS_TWO = '14Gjs1TD93gnwEBfDMHoCgsuf1s2TVKUP6Z1qKmAZnZ8cW5q';

const displayed: DisplayedStrings = {
  names: {
    [accountId(1)]: 'Stakely',
    [accountId(2)]: 'P2P.ORG/node-2',
  },
  addresses: {
    [accountId(1)]: ADDRESS_ONE,
    [accountId(2)]: ADDRESS_TWO,
  },
};

const validators = [makeValidator(1), makeValidator(2), makeValidator(3)];

describe('searchValidators', () => {
  it('returns the source list untouched for an empty or whitespace query', () => {
    expect(searchValidators(validators, '', displayed)).toBe(validators);
    expect(searchValidators(validators, '   ', displayed)).toBe(validators);
  });

  it('matches the resolved identity name, case-insensitively', () => {
    expect(ids(searchValidators(validators, 'stakely', displayed))).toEqual([accountId(1)]);
    expect(ids(searchValidators(validators, 'NODE-2', displayed))).toEqual([accountId(2)]);
  });

  it('matches the displayed ss58 address', () => {
    expect(ids(searchValidators(validators, ADDRESS_TWO, displayed))).toEqual([accountId(2)]);
    expect(ids(searchValidators(validators, ADDRESS_ONE.slice(0, 8), displayed))).toEqual([accountId(1)]);
  });

  it('never matches the raw hex account id', () => {
    // The account id of validator 3 - nothing on screen shows it, so typing it
    // must not conjure the row.
    expect(searchValidators(validators, accountId(3), displayed)).toEqual([]);
    expect(searchValidators(validators, accountId(3).slice(2, 20), displayed)).toEqual([]);
  });

  it('finds nothing for a validator with neither name nor address on screen', () => {
    expect(searchValidators(validators, 'anything', displayed)).toEqual([]);
  });

  it('preserves the incoming order instead of re-ranking by match weight', () => {
    // Validator 2 matches by name at position 0 (weight 1); validator 1 matches
    // only by address, late in the string (weight 0.3). Weight ranking would put
    // validator 2 first - the sorted order says validator 1.
    const nodeDisplayed: DisplayedStrings = {
      names: { [accountId(1)]: 'runner-zzz', [accountId(2)]: 'node-runner' },
      addresses: { [accountId(1)]: 'aaa-node-xyz', [accountId(2)]: 'bbb-address' },
    };

    expect(ids(searchValidators(validators, 'node', nodeDisplayed))).toEqual([accountId(1), accountId(2)]);
  });

  it('preserves the incoming order when every row matches', () => {
    const allDisplayed: DisplayedStrings = {
      names: { [accountId(1)]: 'zzz-node', [accountId(2)]: 'aaa-node', [accountId(3)]: 'mmm-node' },
      addresses: {},
    };

    expect(ids(searchValidators(validators, 'node', allDisplayed))).toEqual([accountId(1), accountId(2), accountId(3)]);
  });

  it('falls back to the displayed address for validators with no identity', () => {
    const noNames: DisplayedStrings = { names: {}, addresses: { [accountId(3)]: ADDRESS_ONE } };

    expect(ids(searchValidators(validators, ADDRESS_ONE, noNames))).toEqual([accountId(3)]);
  });
});
