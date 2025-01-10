import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useStakingRewards } from '../stakingRewardsService';

vi.mock('@apollo/client', async () => ({
  ...(await vi.importActual('@apollo/client')),
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
