import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { createQueryResource } from '@/shared/query';

import { perbillToPercent } from './calculator';
import { apyService } from './service';

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
