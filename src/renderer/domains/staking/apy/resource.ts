import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { createQueryResource } from '@/shared/query';

import { perbillToPercent } from './calculator';
import { type NetworkAvgRate, apyService } from './service';

export type ApyResourceParams = {
  api: ApiPromise;
  // Relay-chain api, used to derive the era duration (Asset Hub has no Babe pallet).
  timelineApi: ApiPromise;
  chain: Chain;
  chainId: ChainId;
  era: EraIndex;
};

const $apyCache = createStore<Record<ChainId, string | null>>({});

export const apyResource = createQueryResource<ApyResourceParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('networkApy')
  .request<string | null>(async ({ api, timelineApi, chain, era }) => {
    const prefs = await stakingPallet.storage.erasValidatorPrefs(api, era);
    const validators = prefs.map(({ prefs }) => ({ commission: perbillToPercent(prefs.commission) }));

    return apyService.getNetworkApy({ api, timelineApi, chain, era, validators });
  })
  .cache({
    store: $apyCache,
    map: (state, apy, { chainId }) => ({ ...state, [chainId]: apy }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();

export type NetworkAvgRateParams = ApyResourceParams;

const $networkAvgRateCache = createStore<Record<ChainId, NetworkAvgRate | null>>({});

/**
 * Trailing ~30d network average reward rate per chain. Era-keyed like
 * `apyResource`: a rollover changes the key and triggers exactly one refetch; a
 * window of closed eras never changes, so a non-null result never goes stale; a
 * `null` (unknown) result is not cached and is re-requested on the next mount -
 * deliberate, it doubles as retry after a transient failure. To keep that retry
 * cheap, the validator prefs (the heaviest read, duplicated with `apyResource`
 * — accepted, once per era per chain) load lazily: an unmeasurable chain never
 * pays for them.
 */
export const networkAvgRateResource = createQueryResource<NetworkAvgRateParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('networkAvgRewardRate')
  .request<NetworkAvgRate | null>(async ({ api, timelineApi, chain, era }) => {
    const loadValidators = async () => {
      const prefs = await stakingPallet.storage.erasValidatorPrefs(api, era);

      return prefs.map(({ prefs }) => ({ commission: perbillToPercent(prefs.commission) }));
    };

    return apyService.getNetworkAvgRewardRate({ api, timelineApi, chain, era, loadValidators });
  })
  .cache({
    store: $networkAvgRateCache,
    map: (state, rate, { chainId }) => ({ ...state, [chainId]: rate }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();
