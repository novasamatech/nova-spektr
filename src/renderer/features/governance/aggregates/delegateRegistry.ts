import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import { getBlockTimeAgo } from '@/shared/lib/utils';
import { networkSelectorModel } from '../model/networkSelector';

const requestDelegateRegistry = createEvent();

const $delegateRegistry = createStore<DelegateAccount[]>([]);

type DelegateRegistryParams = {
  chain: Chain;
  api: ApiPromise;
};

const requestDelegateRegistryFx = createEffect(
  async ({ chain, api }: DelegateRegistryParams): Promise<DelegateAccount[]> => {
    const blockNumber = await getBlockTimeAgo(1000 * 60 * 60 * 24 * 30, api);
    const delegates = await delegationService.getDelegatesFromRegistry(chain);
    const stats = await delegationService.getDelegatesFromExternalSource(chain, blockNumber);

    return delegationService.aggregateDelegateAccounts(delegates, stats);
  },
);

sample({
  clock: requestDelegateRegistry,
  source: { api: networkSelectorModel.$governanceChainApi, chain: networkSelectorModel.$governanceChain },
  filter: ({ api, chain }) => !!api && !!chain,
  fn: ({ api, chain }) => ({ chain: chain!, api: api! }),
  target: requestDelegateRegistryFx,
});

sample({
  clock: requestDelegateRegistryFx.doneData,
  target: $delegateRegistry,
});

export const delegateRegistryAggregate = {
  $delegateRegistry: readonly($delegateRegistry),
  $isRegistryLoading: requestDelegateRegistryFx.pending,

  events: {
    requestDelegateRegistry,
  },
};
