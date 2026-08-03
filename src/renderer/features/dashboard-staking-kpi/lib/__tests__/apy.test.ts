import { computeWeightedApy, earningPositions, earningStakeByChain } from '../apy';

import { ALICE, BOB, KUSAMA, POLKADOT, makePosition } from './fixtures';

describe('earning positions', () => {
  test('only `active` positions earn', () => {
    const positions = [
      makePosition({ status: 'active' }),
      makePosition({ status: 'waiting' }),
      makePosition({ status: 'inactive' }),
      makePosition({ status: 'bonded' }),
    ];

    expect(earningPositions(positions)).toHaveLength(1);
  });

  test('stake is summed per chain, non-earning positions excluded', () => {
    const stake = earningStakeByChain([
      makePosition({ chainId: POLKADOT, active: '100' }),
      makePosition({ chainId: POLKADOT, accountId: BOB, active: '250' }),
      // bonded but not nominating — contributes nothing
      makePosition({ chainId: POLKADOT, status: 'bonded', active: '9999' }),
      makePosition({ chainId: KUSAMA, active: '40' }),
    ]);

    expect(stake).toEqual({ [POLKADOT]: '350', [KUSAMA]: '40' });
  });

  test('a selection with nothing active yields no weights', () => {
    expect(earningStakeByChain([makePosition({ status: 'inactive' })])).toEqual({});
  });
});

describe('stake-weighted APY', () => {
  test('blends by fiat weight', () => {
    const apy = computeWeightedApy([
      { chainId: POLKADOT, apy: 10, weight: '300' },
      { chainId: KUSAMA, apy: 20, weight: '100' },
    ]);

    expect(apy).toBeCloseTo(12.5);
  });

  test('a single chain returns its own APY', () => {
    expect(computeWeightedApy([{ chainId: POLKADOT, apy: 16, weight: '1' }])).toBe(16);
  });

  test('a chain with an unknown APY is skipped, not counted as zero', () => {
    const apy = computeWeightedApy([
      { chainId: POLKADOT, apy: 16, weight: '100' },
      { chainId: KUSAMA, apy: null, weight: '100' },
    ]);

    expect(apy).toBe(16);
  });

  test('a chain with no earning stake carries no weight', () => {
    const apy = computeWeightedApy([
      { chainId: POLKADOT, apy: 16, weight: '100' },
      { chainId: KUSAMA, apy: 40, weight: '0' },
    ]);

    expect(apy).toBe(16);
  });

  test('nothing weighable reads as unknown rather than zero', () => {
    expect(computeWeightedApy([])).toBeNull();
    expect(computeWeightedApy([{ chainId: POLKADOT, apy: null, weight: '100' }])).toBeNull();
    expect(computeWeightedApy([{ chainId: POLKADOT, apy: 16, weight: '0' }])).toBeNull();
  });
});

describe('end to end over positions', () => {
  test('an idle position does not drag the headline APY down', () => {
    const positions = [
      makePosition({ chainId: POLKADOT, accountId: ALICE, status: 'active', active: '100' }),
      makePosition({ chainId: KUSAMA, accountId: BOB, status: 'inactive', active: '900' }),
    ];

    const stake = earningStakeByChain(positions);
    const apy = computeWeightedApy([
      { chainId: POLKADOT, apy: 16, weight: stake[POLKADOT] ?? '0' },
      { chainId: KUSAMA, apy: 2, weight: stake[KUSAMA] ?? '0' },
    ]);

    expect(apy).toBe(16);
  });
});
