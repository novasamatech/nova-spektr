import { renderHook } from '@testing-library/react';

import { useStakingData } from '../stakingDataService';

describe('services/staking/stakingDataService', () => {
  test('should return functions', () => {
    const {
      result: { current },
    } = renderHook(() => useStakingData());

    expect(current.subscribeStaking).toBeDefined();
    expect(current.getMinNominatorBond).toBeDefined();
  });
});
