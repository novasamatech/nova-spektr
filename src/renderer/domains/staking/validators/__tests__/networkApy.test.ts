import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../../constants';
import { type ApyValidator } from '../../types';
import { getNetworkApy } from '../service';

// Polkadot Asset Hub-like figures (observed onchain): a fixed per-era staker mint
// of 130 162 DOT over a 24h era, against ~873.9M DOT staked → ~5.44% APR.
const TO_STAKERS = '1301621489239150';
const TOTAL_STAKED = '8739307348715573817';

type ApiOverrides = {
  toStakers?: string | number | null;
  totalStaked?: string;
  withInflationApi?: boolean;
  eraReward?: string | null;
};

const mockApi = ({
  toStakers = TO_STAKERS,
  totalStaked = TOTAL_STAKED,
  withInflationApi = true,
  eraReward = null,
}: ApiOverrides = {}): ApiPromise => {
  const inflation = withInflationApi
    ? {
        experimentalIssuancePredictionInfo: jest.fn().mockResolvedValue({
          toJSON: () => ({ issuance: '0x0', nextMint: [toStakers, '229697909865732'] }),
        }),
      }
    : undefined;

  return {
    call: { inflation },
    consts: { staking: { sessionsPerEra: { toNumber: () => 6 } } },
    query: {
      staking: {
        erasTotalStake: jest.fn().mockResolvedValue({ toString: () => totalStaked }),
        erasValidatorReward: jest
          .fn()
          .mockResolvedValue(
            eraReward === null ? { isSome: false } : { isSome: true, unwrap: () => ({ toString: () => eraReward }) },
          ),
      },
    },
  } as unknown as ApiPromise;
};

// Relay chain: 24h era = 6 sessions × 2400 blocks × 6000ms.
const relayApi = (epochDuration = 2400, blockTime = 6000): ApiPromise =>
  ({
    consts: {
      babe: { epochDuration: { toNumber: () => epochDuration }, expectedBlockTime: { toNumber: () => blockTime } },
    },
  }) as unknown as ApiPromise;

const polkadotAh = { chainId: AssetHubChains.POLKADOT_AH } as Chain;

const validators = (...commissions: number[]): ApyValidator[] =>
  commissions.map((commission, index) => ({
    accountId: String(index) as AccountId,
    totalStake: '0',
    commission,
  }));

describe('getNetworkApy', () => {
  test('annualises the per-era staker mint over the era duration', async () => {
    const apy = await getNetworkApy({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0, 0, 0),
    });

    // 1301621489239150 × 365.25 / 8739307348715573817 × 100
    expect(apy).toEqual('5.44');
  });

  test('reduces gross APR by the median validator commission', async () => {
    const apy = await getNetworkApy({
      api: mockApi(),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(10, 10, 10),
    });

    // 5.44 × (1 − 0.10)
    expect(apy).toEqual('4.90');
  });

  test('falls back to the last completed era reward when the inflation API is missing', async () => {
    const apy = await getNetworkApy({
      api: mockApi({ withInflationApi: false, eraReward: TO_STAKERS }),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(apy).toEqual('5.44');
  });

  test('falls back to a per-chain era duration when relay Babe consts are unavailable', async () => {
    const apy = await getNetworkApy({
      api: mockApi(),
      timelineApi: { consts: {} } as unknown as ApiPromise,
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    // Polkadot AH fallback is also 24h, so the result matches the dynamic case.
    expect(apy).toEqual('5.44');
  });

  test('returns null when no staker reward can be resolved', async () => {
    const apy = await getNetworkApy({
      api: mockApi({ withInflationApi: false, eraReward: null }),
      timelineApi: relayApi(),
      chain: polkadotAh,
      era: 100,
      validators: validators(0),
    });

    expect(apy).toBeNull();
  });
});
