import { BN, BN_ZERO } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { type Asset } from '@/shared/core';
import { MINIMUM_BOND_RULE, checkMinimumBond, isBelowMinimumBond } from '../staking';

const bn = (value: string | number) => new BN(value);
const asset = { assetId: 0, symbol: 'DOT', precision: 2, name: 'Polkadot' } as unknown as Asset;

describe('isBelowMinimumBond', () => {
  it('flags an amount under the minimum', () => {
    expect(isBelowMinimumBond({ amount: bn(99), minimumBond: bn(100) })).toBe(true);
  });

  it('accepts exactly the minimum', () => {
    expect(isBelowMinimumBond({ amount: bn(100), minimumBond: bn(100) })).toBe(false);
  });

  it('accepts more than the minimum', () => {
    expect(isBelowMinimumBond({ amount: bn(101), minimumBond: bn(100) })).toBe(false);
  });

  it('does not flag an empty amount — that is a required-field matter', () => {
    expect(isBelowMinimumBond({ amount: BN_ZERO, minimumBond: bn(100) })).toBe(false);
  });

  it('treats an unknown (zero) minimum as no floor', () => {
    expect(isBelowMinimumBond({ amount: bn(1), minimumBond: BN_ZERO })).toBe(false);
  });
});

describe('checkMinimumBond', () => {
  it('names the rule and the formatted minimum', () => {
    expect(checkMinimumBond({ amount: bn(99), minimumBond: bn(12345), asset })).toEqual({
      rule: MINIMUM_BOND_RULE,
      message: 'staking.belowMinimumBondError',
      values: { minimum: '123.45 DOT' },
    });
  });

  it('passes at the minimum', () => {
    expect(checkMinimumBond({ amount: bn(100), minimumBond: bn(100), asset })).toBeUndefined();
  });
});
