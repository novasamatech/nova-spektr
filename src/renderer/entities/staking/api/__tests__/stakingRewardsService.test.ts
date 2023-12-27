import { renderHook } from '@testing-library/react';

import { useStakingRewards } from '../stakingRewardsService';

jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn().mockReturnValue({
    data: { accumulatedRewards: { nodes: [] } },
    loading: false,
  }),
}));

describe('services/staking/stakingTxService', () => {
  test('should return functions', () => {
    const {
      result: { current },
    } = renderHook(() => useStakingRewards([]));

    expect(current.rewards).toBeDefined();
    expect(current.isRewardsLoading).toBeDefined();
  });
});
