import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { eraThresholdsService } from '../service';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    storage: {
      erasStakersOverview: vi.fn(),
    },
  },
}));

const storage = vi.mocked(stakingPallet.storage);

const api = {} as ApiPromise;
const ERA = 2258;

const alice = '0x01' as AccountId;
const bob = '0x02' as AccountId;
const charlie = '0x03' as AccountId;

const entry = (validator: AccountId, total: string) => ({
  validator,
  overview: { total: new BN(total), own: new BN(0), nominatorCount: 1, pageCount: 1 },
});

describe('eraThresholdsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return the smallest total backing and the validator count', async () => {
    storage.erasStakersOverview.mockResolvedValue([
      entry(alice, '2345005000000000'),
      entry(bob, '1149983000000000'),
      entry(charlie, '1455956000000000'),
    ]);

    const result = await eraThresholdsService.getEraThreshold(api, ERA);

    expect(result).toEqual({ era: ERA, minStake: '1149983000000000', validatorCount: 3 });
  });

  test('should compare totals as big integers, not strings', async () => {
    // '900' < '1000' numerically but '1000' < '900' lexicographically.
    storage.erasStakersOverview.mockResolvedValue([entry(alice, '1000'), entry(bob, '900')]);

    const result = await eraThresholdsService.getEraThreshold(api, ERA);

    expect(result?.minStake).toBe('900');
  });

  test('should return null for an era without overview entries', async () => {
    storage.erasStakersOverview.mockResolvedValue([]);

    await expect(eraThresholdsService.getEraThreshold(api, ERA)).resolves.toBeNull();
  });
});
