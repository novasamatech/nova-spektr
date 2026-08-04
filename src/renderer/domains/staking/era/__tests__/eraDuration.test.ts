import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { AssetHubChains, DEFAULT_ERA_DURATION_MS } from '../../constants';
import { getEraDurationMs } from '../duration';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    consts: { sessionsPerEra: vi.fn() },
  },
}));

const consts = vi.mocked(stakingPallet.consts);

const SESSIONS_PER_ERA = 6;
const EPOCH_DURATION = 2400;
const BLOCK_TIME_MS = 6000;

const api = {} as ApiPromise;

// Relay chain: 24h era = 6 sessions × 2400 blocks × 6000ms.
const relayApi = (babe: Record<string, number> = { epochDuration: EPOCH_DURATION, expectedBlockTime: BLOCK_TIME_MS }) =>
  ({ consts: { babe } }) as unknown as ApiPromise;

/** Asset Hub is what the timeline api collapses onto without a relay connection. */
const assetHubApi = { consts: {} } as unknown as ApiPromise;

// `EraDurationChain` accepts a bare id, so no cast to a full `Chain` is needed.
const polkadotAh = { chainId: AssetHubChains.POLKADOT_AH };

describe('domains/staking/era/duration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.sessionsPerEra.mockReturnValue(SESSIONS_PER_ERA);
  });

  test('should derive the era length from the timeline babe consts', () => {
    expect(getEraDurationMs(api, relayApi(), polkadotAh)).toEqual(SESSIONS_PER_ERA * EPOCH_DURATION * BLOCK_TIME_MS);
  });

  test('should use the chain block time override when babe exposes no expected block time', () => {
    const chain = {
      chainId: AssetHubChains.POLKADOT_AH,
      nodes: [],
      assets: [],
      additional: { defaultBlockTime: BLOCK_TIME_MS },
    } as unknown as Chain;

    expect(getEraDurationMs(api, relayApi({ epochDuration: EPOCH_DURATION }), chain)).toEqual(
      SESSIONS_PER_ERA * EPOCH_DURATION * BLOCK_TIME_MS,
    );
  });

  test.each([
    ['Polkadot Asset Hub', AssetHubChains.POLKADOT_AH, 24 * 60 * 60 * 1000],
    ['Kusama Asset Hub', AssetHubChains.KUSAMA_AH, 6 * 60 * 60 * 1000],
    ['Westend Asset Hub', AssetHubChains.WESTEND_AH, 6 * 60 * 60 * 1000],
  ])('should fall back to the %s era length when no timeline api is connected', (_name, chainId, expected) => {
    expect(getEraDurationMs(api, null, { chainId })).toEqual(expected);
  });

  test('should fall back when the timeline api carries no babe pallet', () => {
    expect(getEraDurationMs(api, assetHubApi, { chainId: AssetHubChains.KUSAMA_AH })).toEqual(6 * 60 * 60 * 1000);
  });

  test('should fall back to the default era length for unknown chains', () => {
    expect(getEraDurationMs(api, null, { chainId: '0x00' })).toEqual(DEFAULT_ERA_DURATION_MS);
    expect(getEraDurationMs(api, null)).toEqual(DEFAULT_ERA_DURATION_MS);
  });

  test('should fall back instead of throwing when the staking consts are unavailable', () => {
    consts.sessionsPerEra.mockImplementation(() => {
      throw new Error('not in metadata');
    });

    expect(getEraDurationMs(api, relayApi(), { chainId: AssetHubChains.KUSAMA_AH })).toEqual(6 * 60 * 60 * 1000);
  });
});
