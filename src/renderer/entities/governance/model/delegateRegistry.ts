import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import { getTimeFromBlock } from '@/shared/lib/utils';
import { networkSelectorModel } from '@/features/governance';

const requestDelegateRegistry = createEvent<Chain>();

const $delegateRegistry = createStore<DelegateAccount[]>([]);

type DelegateRegistryParams = {
  chain: Chain;
  api: ApiPromise;
};

const requestDelegateRegistryFx = createEffect(
  async ({ chain, api }: DelegateRegistryParams): Promise<DelegateAccount[]> => {
    const blockNumber = await getTimeFromBlock(1000 * 60 * 60 * 24 * 30, api);
    const delegates = await delegationService.getDelegatesFromRegistry(chain);
    const stats = await delegationService.getDelegatesFromExternalSource(chain, blockNumber);

    return delegationService.aggregateDelegateAccounts(delegates, stats);
  },
);

sample({
  clock: requestDelegateRegistry,
  source: networkSelectorModel.$governanceChainApi,
  filter: (api) => !!api,
  fn: (api, chain) => ({ chain, api: api! }),
  target: requestDelegateRegistryFx,
});

sample({
  clock: requestDelegateRegistryFx.doneData,
  target: $delegateRegistry,
});

export const delegateRegistryModel = {
  $delegateRegistry: readonly($delegateRegistry),
  $isRegistryLoading: requestDelegateRegistryFx.pending,

  events: {
    requestDelegateRegistry,
  },
};
