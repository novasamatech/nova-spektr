import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type Chain } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
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

// Polkadot Asset Hub-like figures: a per-era staker reward of 130 162 DOT over
// a 24h era, against ~873.9M DOT staked → ~5.44% APR.
const TO_STAKERS = '1301621489239150';
const TOTAL_STAKED = '8739307348715573817';

type ApiOverrides = {
  totalIssuance?: string | null;
  predictionCall?: ReturnType<typeof vi.fn>;
};

const mockApi = ({ totalIssuance = null, predictionCall }: ApiOverrides = {}) => {
  const balances = totalIssuance
    ? { totalIssuance: vi.fn().mockResolvedValue({ toString: () => totalIssuance }) }
    : undefined;

  const inflation = predictionCall ? { experimentalIssuancePredictionInfo: predictionCall } : undefined;

  return { call: { inflation }, query: { balances } } as unknown as ApiPromise;
};

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

describe('getNetworkApy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.sessionsPerEra.mockReturnValue(6);
    storage.erasTotalStake.mockResolvedValue(new BN(TOTAL_STAKED));
    storage.erasValidatorReward.mockResolvedValue([{ era: 99, reward: new BN(TO_STAKERS) }]);
  });

  test('annualises the last completed era staker reward over the era duration', async () => {
    const apy = await apyService.getNetworkApy({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0, 0, 0),
    });

    // 1301621489239150 × 365.25 / 8739307348715573817 × 100
    expect(storage.erasValidatorReward).toHaveBeenCalledWith(expect.anything(), [99]);
    expect(apy).toEqual('5.44');
  });

  test('reduces gross APR by the median validator commission', async () => {
    const apy = await apyService.getNetworkApy({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(10, 10, 10),
    });

    // 5.44 × (1 − 0.10)
    expect(apy).toEqual('4.90');
  });

  test('ignores the issuance prediction API whose nextMint is the total era emission since the DAP reform', async () => {
    const predictionCall = vi.fn().mockResolvedValue({
      // ~2.21× the staker reward - the pre-DAP interpretation would overstate APY.
      toJSON: () => ({ issuance: '0x0', nextMint: ['2879160367447112', '0'] }),
    });

    const apy = await apyService.getNetworkApy({
      api: mockApi({ predictionCall }),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(predictionCall).not.toHaveBeenCalled();
    expect(apy).toEqual('5.44');
  });

  test('falls back to a per-chain era duration when relay Babe consts are unavailable', async () => {
    const apy = await apyService.getNetworkApy({
      api: mockApi(),
      timelineApi: { consts: {} } as unknown as ApiPromise,
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    // Polkadot AH fallback is also 24h, so the result matches the dynamic case.
    expect(apy).toEqual('5.44');
  });

  test('falls back to a per-chain era duration when no relay api is connected', async () => {
    const apy = await apyService.getNetworkApy({
      api: mockApi(),
      timelineApi: null,
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(apy).toEqual('5.44');
  });

  test('falls back to the NPoS curve when the chain reports no era reward at all', async () => {
    storage.erasValidatorReward.mockResolvedValue([{ era: 99, reward: null }]);

    const apy = await apyService.getNetworkApy({
      api: mockApi({ totalIssuance: '17478614697431147634' }),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    // 50% staked → curve inflation ≈ 7.5% → pool rate ≈ 15%.
    expect(apy).toEqual('15.00');
  });

  test('returns null when no staker reward can be resolved', async () => {
    storage.erasValidatorReward.mockResolvedValue([{ era: 99, reward: null }]);

    const apy = await apyService.getNetworkApy({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(apy).toBeNull();
  });

  test('returns null when the era has no total stake', async () => {
    storage.erasTotalStake.mockResolvedValue(new BN(0));

    const apy = await apyService.getNetworkApy({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(apy).toBeNull();
  });
});

describe('getEraDurationMs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.sessionsPerEra.mockReturnValue(6);
  });

  test('derives the era length from the relay Babe consts', () => {
    const duration = apyService.getEraDurationMs({} as ApiPromise, relayApi(), polkadotAh);

    expect(duration).toEqual(6 * 2400 * 6000);
  });

  test('uses the per-chain fallback for Kusama Asset Hub', () => {
    const duration = apyService.getEraDurationMs({} as ApiPromise, null, {
      chainId: AssetHubChains.KUSAMA_AH,
    } as Chain);

    expect(duration).toEqual(6 * 60 * 60 * 1000);
  });
});
