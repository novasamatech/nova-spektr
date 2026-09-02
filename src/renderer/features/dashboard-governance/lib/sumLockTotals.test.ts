import { BN } from '@polkadot/util';
import { describe, expect, it } from 'vitest';

import { type GovernanceLockRow } from './buildLockRows';
import { sumLockTotals } from './sumLockTotals';

/** Only the fiat fields matter here; everything else is filler. */
const row = (fiat: Partial<Pick<GovernanceLockRow, 'claimableFiat' | 'pendingFiat' | 'delegatedFiat'>>) =>
  ({
    claimableFiat: null,
    pendingFiat: null,
    delegatedFiat: null,
    // The totals never read these; a cast keeps the fixture honest about that.
    ...({ claimable: new BN(0), pending: new BN(0), delegated: new BN(0) } as Pick<
      GovernanceLockRow,
      'claimable' | 'pending' | 'delegated'
    >),
    ...fiat,
  }) as GovernanceLockRow;

describe('sumLockTotals', () => {
  it('sums each figure across rows and chains', () => {
    const totals = sumLockTotals([
      row({ claimableFiat: '10.5', pendingFiat: '1', delegatedFiat: '0.25' }),
      row({ claimableFiat: '2', pendingFiat: '3.5' }),
    ]);

    expect(totals).toEqual({ claimable: '12.5', pending: '4.5', delegated: '0.25' });
  });

  it('counts a missing fiat as zero', () => {
    expect(sumLockTotals([row({}), row({ claimableFiat: '7' })])).toEqual({
      claimable: '7',
      pending: '0',
      delegated: '0',
    });
  });

  it('is all zeros for no rows', () => {
    expect(sumLockTotals([])).toEqual({ claimable: '0', pending: '0', delegated: '0' });
  });
});
