import { toAccountId } from '@/shared/lib/utils';
import { nominationsService } from '../service';

const ACCOUNT = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');

describe('domains/staking/nominations/service', () => {
  describe('mapPayee', () => {
    test.each(['Staked', 'Stash', 'Controller'] as const)('should keep the %s destination', destination => {
      expect(nominationsService.mapPayee({ type: destination, data: null })).toEqual(destination);
    });

    test('should encode the account destination with the chain prefix', () => {
      expect(nominationsService.mapPayee({ type: 'Account', data: ACCOUNT }, 2)).toEqual({
        Account: 'HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F',
      });
    });

    test('should treat the None destination as no payee', () => {
      expect(nominationsService.mapPayee({ type: 'None', data: null })).toBeNull();
    });

    test('should treat a missing destination as no payee', () => {
      expect(nominationsService.mapPayee(null)).toBeNull();
    });
  });
});
