import { BN, BN_ZERO } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { getAvailableToBond, isBelowMinimumBond } from '../amount-rules';

const bn = (value: string | number) => new BN(value);

describe('getAvailableToBond', () => {
  it('takes the fee off the reservable balance', () => {
    expect(getAvailableToBond({ reservable: bn(100), fee: bn(30) }).toString()).toBe('70');
  });

  it('is the whole reservable balance while the fee is unknown', () => {
    expect(getAvailableToBond({ reservable: bn(100), fee: null }).toString()).toBe('100');
  });

  it('never goes negative when the fee outgrows the balance', () => {
    // The user sees "0 available", not a negative maximum they could type into.
    expect(getAvailableToBond({ reservable: bn(10), fee: bn(40) }).toString()).toBe('0');
  });

  it('handles an empty balance', () => {
    expect(getAvailableToBond({ reservable: BN_ZERO, fee: bn(5) }).toString()).toBe('0');
  });
});

describe('isBelowMinimumBond', () => {
  it('flags a bond under the chain minimum', () => {
    expect(isBelowMinimumBond({ amount: bn(99), minimumBond: bn(100) })).toBe(true);
  });

  it('accepts exactly the minimum', () => {
    // `staking.nominate` requires `active >= MinNominatorBond`, so the boundary
    // itself is legal — off by one here would block a valid position.
    expect(isBelowMinimumBond({ amount: bn(100), minimumBond: bn(100) })).toBe(false);
  });

  it('accepts anything above it', () => {
    expect(isBelowMinimumBond({ amount: bn(101), minimumBond: bn(100) })).toBe(false);
  });

  it('says nothing while the amount is still empty', () => {
    // An untouched form is not an error.
    expect(isBelowMinimumBond({ amount: BN_ZERO, minimumBond: bn(100) })).toBe(false);
  });

  it('says nothing while the chain has not answered', () => {
    // A zero minimum means "unknown", and nothing is below an unknown floor.
    expect(isBelowMinimumBond({ amount: bn(1), minimumBond: BN_ZERO })).toBe(false);
  });
});
