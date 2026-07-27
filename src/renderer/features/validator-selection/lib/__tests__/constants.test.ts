import { describe, expect, it } from 'vitest';

import { DEFAULT_FILTERS, DEFAULT_SORT } from '../constants';

describe('defaults', () => {
  it('starts with identity required and slashed validators hidden, everything else open', () => {
    expect(DEFAULT_FILTERS).toEqual({
      minApy: null,
      maxCommission: null,
      minOwnStake: null,
      hideOversubscribed: false,
      hideIdle: false,
      hasIdentity: true,
      neverSlashed: true,
    });
  });

  it('sorts by apy, best paying first', () => {
    expect(DEFAULT_SORT).toEqual({ column: 'apy', direction: 'desc' });
  });
});
