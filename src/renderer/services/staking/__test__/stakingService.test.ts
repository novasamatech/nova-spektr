import { renderHook } from '@testing-library/react';

import { useStaking } from '@renderer/services/staking/stakingService';

describe('services/staking', () => {
  test('should return functions', () => {
    const {
      result: {
        current: { staking, getLedger, getNominators },
      },
    } = renderHook(() => useStaking('0x123'));

    expect(staking).toBeDefined();
    expect(getLedger).toBeDefined();
    expect(getNominators).toBeDefined();
  });
});
