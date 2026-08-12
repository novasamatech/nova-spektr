import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type Chain } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { AssetHubChains } from '../../constants';
import { apyService } from '../service';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    consts: { sessionsPerEra: vi.fn(), historyDepth: vi.fn() },
    storage: { erasTotalStake: vi.fn(), erasTotalStakeMulti: vi.fn(), erasValidatorReward: vi.fn() },
  },
}));

const consts = vi.mocked(stakingPallet.consts);
const storage = vi.mocked(stakingPallet.storage);

// Polkadot Asset Hub-like figures: a per-era staker reward of 130 162 DOT over
// a 24h era, against ~873.9M DOT staked → ~5.44% APR per era.
const TO_STAKERS = '1301621489239150';
const TOTAL_STAKED = '8739307348715573817';

const mockApi = () => ({}) as unknown as ApiPromise;

// Relay chain: 24h era = 6 sessions × 2400 blocks × 6000ms.
const relayApi = (epochDuration = 2400, blockTime = 6000): ApiPromise =>
  ({
    consts: {
      babe: {
        epochDuration: { toString: () => String(epochDuration) },
        expectedBlockTime: { toString: () => String(blockTime) },
      },
    },
  }) as unknown as ApiPromise;

const polkadotAh = { chainId: AssetHubChains.POLKADOT_AH } as Chain;

const validators = (...commissions: number[]) => commissions.map(commission => ({ commission }));

/** Every requested era answers with the same constant reward. */
const constantRewards = () => {
  storage.erasValidatorReward.mockImplementation((_, eras) =>
    Promise.resolve(eras.map(era => ({ era, reward: new BN(TO_STAKERS) }))),
  );
};

/** Every requested era answers with the same constant total stake. */
const constantStakes = () => {
  storage.erasTotalStakeMulti.mockImplementation((_, eras) =>
    Promise.resolve(eras.map(era => ({ era, totalStake: new BN(TOTAL_STAKED) }))),
  );
};

describe('getNetworkAvgRewardRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.sessionsPerEra.mockReturnValue(6);
    consts.historyDepth.mockReturnValue(84);
    constantRewards();
    constantStakes();
  });

  test('averages the realized rate over a 30 era window on a 24h era chain', async () => {
    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0, 0, 0),
    });

    // 30d / 24h era = 30 completed eras: [70..99].
    expect(storage.erasValidatorReward).toHaveBeenCalledWith(
      expect.anything(),
      Array.from({ length: 30 }, (_, index) => 70 + index),
    );
    expect(rate).toEqual({ ratePercent: '5.44', fromEra: 70, toEra: 99, days: 30 });
  });

  test('caps the window at HistoryDepth on a 6h era chain and reports the real day count', async () => {
    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      // 6h era: 6 sessions × 600 blocks × 6000ms.
      timelineApi: relayApi(600),
      chain: { chainId: AssetHubChains.KUSAMA_AH } as Chain,
      era: 100,
      validators: validators(0),
    });

    // 30d / 6h era = 120 eras wanted, capped at depth 84 → [16..99] ≈ 21 days.
    // Per-era rate is 4× the 24h-era baseline (4× the eras per year).
    expect(rate).toEqual({ ratePercent: '21.76', fromEra: 16, toEra: 99, days: 21 });
  });

  test('shrinks the window on a chain younger than 30 days and truly averages the eras', async () => {
    storage.erasValidatorReward.mockImplementation((_, eras) =>
      Promise.resolve(
        eras.map(era => ({
          era,
          // Era 0 pays the baseline, era 1 pays 3× — the mean is 2× the baseline.
          reward: era === 0 ? new BN(TO_STAKERS) : new BN(TO_STAKERS).muln(3),
        })),
      ),
    );

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 2,
      validators: validators(0),
    });

    // 2× the single-era 5.44% baseline.
    expect(rate).toEqual({ ratePercent: '10.88', fromEra: 0, toEra: 1, days: 2 });
  });

  test('skips eras with no recorded reward and reports the window of eras that actually contributed', async () => {
    storage.erasValidatorReward.mockImplementation((_, eras) =>
      Promise.resolve(eras.map(era => ({ era, reward: era < 85 ? null : new BN(TO_STAKERS) }))),
    );

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    // Window is [70..99], but only [85..99] (15 eras) produced a rate.
    expect(rate).toEqual({ ratePercent: '5.44', fromEra: 85, toEra: 99, days: 15 });
  });

  test('honours per-era stake when averaging across the window', async () => {
    storage.erasTotalStakeMulti.mockImplementation((_, eras) =>
      Promise.resolve(
        eras.map(era => ({ era, totalStake: era === 0 ? new BN(TOTAL_STAKED) : new BN(TOTAL_STAKED).muln(2) })),
      ),
    );

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 2,
      validators: validators(0),
    });

    // Era 0 rate is the 5.44% baseline; era 1's stake is doubled, halving its
    // rate to 2.72% — the mean of the two is 4.08%.
    expect(rate).toEqual({ ratePercent: '4.08', fromEra: 0, toEra: 1, days: 2 });
  });

  test('reduces the gross average by the median validator commission', async () => {
    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(10, 10, 10),
    });

    // 5.44 × (1 − 0.10)
    expect(rate?.ratePercent).toEqual('4.90');
  });

  test('returns null when no era in the window has a recorded reward — never the NPoS curve', async () => {
    storage.erasValidatorReward.mockImplementation((_, eras) =>
      Promise.resolve(eras.map(era => ({ era, reward: null }))),
    );

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(rate).toBeNull();
  });

  test('returns null when the reward history query fails instead of guessing', async () => {
    storage.erasValidatorReward.mockRejectedValue(new Error('disconnected'));

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(rate).toBeNull();
  });

  test('returns null when the stake history query fails instead of narrowing the average', async () => {
    storage.erasTotalStakeMulti.mockRejectedValue(new Error('disconnected'));

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(rate).toBeNull();
  });

  test('returns null when every era reports zero total stake', async () => {
    storage.erasTotalStakeMulti.mockImplementation((_, eras) =>
      Promise.resolve(eras.map(era => ({ era, totalStake: new BN(0) }))),
    );

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(rate).toBeNull();
  });

  test('returns null when the runtime exposes no HistoryDepth', async () => {
    consts.historyDepth.mockImplementation(() => {
      throw new Error('no staking pallet');
    });

    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(rate).toBeNull();
  });

  test('returns null for era 0 without querying reward history', async () => {
    const rate = await apyService.getNetworkAvgRewardRate({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 0,
      validators: validators(0),
    });

    expect(rate).toBeNull();
    expect(storage.erasValidatorReward).not.toHaveBeenCalled();
  });
});
