import { renderHook } from '@testing-library/react';

import { useStakingData } from '../stakingDataService';

describe('services/staking/stakingDataService', () => {
  test('should return functions', () => {
    const {
      result: { current },
    } = renderHook(() => useStakingData());

    expect(current.staking).toBeDefined();
    expect(current.validators).toBeDefined();
    expect(current.subscribeActiveEra).toBeDefined();
    expect(current.subscribeLedger).toBeDefined();
    expect(current.getValidators).toBeDefined();
    expect(current.getMaxValidators).toBeDefined();
    expect(current.getNominators).toBeDefined();
  });
});
