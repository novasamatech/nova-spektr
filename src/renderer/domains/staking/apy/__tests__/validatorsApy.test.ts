import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type Chain } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../../constants';
import { apyService } from '../service';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    consts: { sessionsPerEra: vi.fn() },
    storage: { erasTotalStake: vi.fn(), erasValidatorReward: vi.fn() },
  },
}));

const consts = vi.mocked(stakingPallet.consts);
const storage = vi.mocked(stakingPallet.storage);

const polkadotAh = { chainId: AssetHubChains.POLKADOT_AH } as Chain;

// 10% pool reward rate: 1000 paid to stakers per era × 365.25 eras/year against 3_652_500 staked.
const TOTAL_STAKED = 3_652_500;
const ERA_REWARD = 1000;

const mockApi = (): ApiPromise => ({ call: {}, query: {} }) as unknown as ApiPromise;

const alice = '0x01' as AccountId;
const bob = '0x02' as AccountId;
const charlie = '0x03' as AccountId;

describe('getValidatorsApy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.sessionsPerEra.mockReturnValue(6);
    storage.erasTotalStake.mockResolvedValue(new BN(TOTAL_STAKED));
    storage.erasValidatorReward.mockResolvedValue([{ era: 99, reward: new BN(ERA_REWARD) }]);
  });

  test('pays a higher rate to validators holding less than the average stake', async () => {
    const apy = await apyService.getValidatorsApy({
      api: mockApi(),
      timelineApi: null,
      chain: polkadotAh,
      era: 100,
      // Average stake is 1_217_500 per validator.
      validators: [
        { accountId: alice, totalStake: String(TOTAL_STAKED / 3), commission: 0 },
        { accountId: bob, totalStake: String((TOTAL_STAKED / 3) * 2), commission: 0 },
        { accountId: charlie, totalStake: String(TOTAL_STAKED / 6), commission: 0 },
      ],
    });

    expect(apy).toEqual({ [alice]: 10, [bob]: 5, [charlie]: 20 });
  });

  test('cuts the commission off the nominator APY', async () => {
    const apy = await apyService.getValidatorsApy({
      api: mockApi(),
      timelineApi: null,
      chain: polkadotAh,
      era: 100,
      validators: [
        { accountId: alice, totalStake: String(TOTAL_STAKED / 2), commission: 0 },
        { accountId: bob, totalStake: String(TOTAL_STAKED / 2), commission: 40 },
      ],
    });

    expect(apy).toEqual({ [alice]: 10, [bob]: 6 });
  });

  test('returns an empty map when the chain reports no reward data', async () => {
    storage.erasValidatorReward.mockResolvedValue([{ era: 99, reward: null }]);

    const apy = await apyService.getValidatorsApy({
      api: mockApi(),
      timelineApi: null,
      chain: polkadotAh,
      era: 100,
      validators: [{ accountId: alice, totalStake: '100', commission: 0 }],
    });

    expect(apy).toEqual({});
  });

  test('returns an empty map without validators', async () => {
    const apy = await apyService.getValidatorsApy({
      api: mockApi(),
      timelineApi: null,
      chain: polkadotAh,
      era: 100,
      validators: [],
    });

    expect(apy).toEqual({});
    expect(storage.erasTotalStake).not.toHaveBeenCalled();
  });

  test('falls back to the summed validator stake when the era total is unavailable', async () => {
    storage.erasTotalStake.mockRejectedValue(new Error('not available'));

    const apy = await apyService.getValidatorsApy({
      api: mockApi(),
      timelineApi: null,
      chain: polkadotAh,
      era: 100,
      validators: [
        { accountId: alice, totalStake: String(TOTAL_STAKED / 2), commission: 0 },
        { accountId: bob, totalStake: String(TOTAL_STAKED / 2), commission: 0 },
      ],
    });

    expect(apy).toEqual({ [alice]: 10, [bob]: 10 });
  });
});
