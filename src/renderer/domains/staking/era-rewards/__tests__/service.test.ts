import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { toAccountId } from '@/shared/lib/utils';
import { type DataCompleteness } from '../../completeness';
import { PERBILL } from '../../payouts/calculator';
import { type RewardSource } from '../../types';
import { getEraValidatorRewards } from '../service';
import { type EraExposureShares } from '../types';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    storage: {
      erasValidatorReward: vi.fn(),
      erasRewardPoints: vi.fn(),
      erasValidatorPrefsFor: vi.fn(),
    },
  },
}));

vi.mock('../subquery', () => ({
  fetchEraExposureShares: vi.fn(),
}));

const { stakingPallet } = await import('@/shared/pallet/staking');
const { fetchEraExposureShares } = await import('../subquery');

const storage = vi.mocked(stakingPallet.storage);
const fetchShares = vi.mocked(fetchEraExposureShares);

const STASH = toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
const VALIDATOR = toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');

const ERA = 10;
const REWARD_SOURCES: RewardSource[] = [{ url: 'https://indexer.test', addressPrefix: 0 }];

const api = {} as ApiPromise;

const EXPOSURE: EraExposureShares = {
  era: ERA,
  validator: VALIDATOR,
  total: '1000',
  own: '200',
  shares: { [STASH]: '300' },
};

function setup(completeness: DataCompleteness, exposures: EraExposureShares[] = [EXPOSURE]) {
  fetchShares.mockResolvedValue({ exposures: completeness === 'unavailable' ? [] : exposures, completeness });

  storage.erasValidatorReward.mockImplementation((_api, eras) =>
    Promise.resolve(eras.map(era => ({ era, reward: new BN(1000) }))),
  );
  storage.erasRewardPoints.mockResolvedValue({ total: 200, individual: [{ key: VALIDATOR, value: 100 }] });
  storage.erasValidatorPrefsFor.mockImplementation((_api, keys) =>
    Promise.resolve(
      keys.map(({ era, validator }) => ({ era, validator, prefs: { commission: PERBILL.divn(10), blocked: false } })),
    ),
  );
}

const params = { api, stashes: [STASH], eraFrom: ERA, eraTo: ERA, rewardSources: REWARD_SOURCES };

const NOMINATOR_REWARD = { era: ERA, validator: VALIDATOR, accountId: STASH, amount: '135', isSelf: false };

describe('domains/staking/era-rewards/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  test('should replay the era formula over a complete exposure scan', async () => {
    setup('complete');

    const result = await getEraValidatorRewards(params);

    expect(result).toEqual({ rewards: [NOMINATOR_REWARD], completeness: 'complete' });
  });

  test('should keep what a partial exposure scan found and say it is partial', async () => {
    setup('partial');

    const result = await getEraValidatorRewards(params);

    expect(result).toEqual({ rewards: [NOMINATOR_REWARD], completeness: 'partial' });
  });

  test('should not report a partial scan that found nothing as nothing earned', async () => {
    setup('partial', []);

    const result = await getEraValidatorRewards(params);

    expect(result).toEqual({ rewards: [], completeness: 'partial' });
    expect(storage.erasValidatorReward).not.toHaveBeenCalled();
  });

  test('should be unavailable when the exposure scan is', async () => {
    setup('unavailable');

    const result = await getEraValidatorRewards(params);

    expect(result).toEqual({ rewards: [], completeness: 'unavailable' });
    expect(storage.erasValidatorReward).not.toHaveBeenCalled();
  });

  test('should be complete and empty when a complete scan found no exposure', async () => {
    setup('complete', []);

    const result = await getEraValidatorRewards(params);

    expect(result).toEqual({ rewards: [], completeness: 'complete' });
  });

  test('should be unavailable, not rejected, when the era reads fail', async () => {
    setup('complete');
    storage.erasRewardPoints.mockRejectedValue(new Error('rpc down'));

    const result = await getEraValidatorRewards(params);

    expect(result).toEqual({ rewards: [], completeness: 'unavailable' });
  });

  test('should answer for an empty era range without asking anyone', async () => {
    setup('complete');

    const result = await getEraValidatorRewards({ ...params, eraFrom: ERA + 1, eraTo: ERA });

    expect(result).toEqual({ rewards: [], completeness: 'complete' });
    expect(fetchShares).not.toHaveBeenCalled();
  });
});
