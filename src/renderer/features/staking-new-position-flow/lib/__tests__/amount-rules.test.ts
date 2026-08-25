import { BN, BN_ZERO } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { getAvailableToBond } from '../amount-rules';

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
