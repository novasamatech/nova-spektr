import { Raw, TypeRegistry } from '@polkadot/types';
import { BN } from '@polkadot/util';

import { toAccountId } from '@/shared/lib/utils';
import { validatorPrefsService } from '../service';

const registry = new TypeRegistry();

const STASH_1 = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const STASH_2 = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

const PREFS = { commission: 5, blocked: false };
const decodePrefs = () => PREFS;

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

  describe('buildValidatorPrefsMap', () => {
    test('should decode a present key under its stash', () => {
      const value = new Raw(registry, new Uint8Array([0x02, 0xc2, 0xeb, 0x0b, 0x00]));

      expect(validatorPrefsService.buildValidatorPrefsMap([STASH_1], [value], decodePrefs)).toEqual({
        [STASH_1]: PREFS,
      });
    });

    test('should treat an absent key as no validator', () => {
      expect(validatorPrefsService.buildValidatorPrefsMap([STASH_1], [new Raw(registry)], decodePrefs)).toEqual({
        [STASH_1]: null,
      });
    });

    test('should decode all-zero bytes as a real 0%-commission validator', () => {
      const zeroPrefs = new Raw(registry, new Uint8Array([0x00, 0x00]));

      expect(validatorPrefsService.buildValidatorPrefsMap([STASH_1], [zeroPrefs], decodePrefs)).toEqual({
        [STASH_1]: PREFS,
      });
    });

    test('should align values with stashes positionally', () => {
      const value = new Raw(registry, new Uint8Array([0x02, 0xc2, 0xeb, 0x0b, 0x00]));

      expect(
        validatorPrefsService.buildValidatorPrefsMap([STASH_1, STASH_2], [new Raw(registry), value], decodePrefs),
      ).toEqual({
        [STASH_1]: null,
        [STASH_2]: PREFS,
      });
    });
  });
});
