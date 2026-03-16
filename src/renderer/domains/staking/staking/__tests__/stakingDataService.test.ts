import { stakingService } from '../service';

describe('services/staking/stakingService', () => {
  test('should return functions', () => {
    expect(stakingService.fetchStakingLedger).toBeDefined();
    expect(stakingService.getMinNominatorBond).toBeDefined();
  });
});
