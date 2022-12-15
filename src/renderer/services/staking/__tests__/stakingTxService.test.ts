import { renderHook } from '@testing-library/react';

import { useStakingTx } from '../stakingTxService';

describe('services/staking/stakingTxService', () => {
  test('should return functions', () => {
    const {
      result: { current },
    } = renderHook(() => useStakingTx());

    expect(current.bondAndNominate).toBeDefined();
    expect(current.bondExtra).toBeDefined();
  });
});
