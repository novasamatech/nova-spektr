import { BN } from '@polkadot/util';

import { validatorPrefsService } from '../service';

describe('domains/staking/validator-prefs/service', () => {
  describe('mapPrefs', () => {
    test('should map raw perbill prefs to percent', () => {
      expect(validatorPrefsService.mapPrefs({ commission: new BN(50_000_000), blocked: true })).toEqual({
        commission: 5,
        blocked: true,
      });
    });

    test('should map zero commission to zero percent', () => {
      expect(validatorPrefsService.mapPrefs({ commission: new BN(0), blocked: false })).toEqual({
        commission: 0,
        blocked: false,
      });
    });
  });
});
