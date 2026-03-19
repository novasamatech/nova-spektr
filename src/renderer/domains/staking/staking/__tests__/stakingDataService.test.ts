import { stakingService } from '../service';

describe('stakingService', () => {
  test('should return functions', () => {
    expect(stakingService.fetchStakingLedger).toBeDefined();
    expect(stakingService.getMinNominatorBond).toBeDefined();
  });
});
