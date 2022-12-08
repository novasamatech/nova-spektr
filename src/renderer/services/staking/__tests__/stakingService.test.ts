import { renderHook } from '@testing-library/react';

import { useStaking } from '@renderer/services/staking/stakingService';

describe('services/staking', () => {
  test('should return functions', () => {
    const {
      result: {
        current: { staking, subscribeLedger, getNominators },
      },
    } = renderHook(() => useStaking());

    expect(staking).toBeDefined();
    expect(subscribeLedger).toBeDefined();
    expect(getNominators).toBeDefined();
  });
});
