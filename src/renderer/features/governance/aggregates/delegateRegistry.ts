import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import { MONTH, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity } from '@/domains/network';
import { networkSelectorModel } from '../model/networkSelector';

const requestDelegateRegistry = createEvent();
const addDelegation = createEvent<{ delegate: DelegateAccount; votes: BN }>();

const $delegateRegistry = createStore<DelegateAccount[]>([]);

type DelegateRegistryParams = {
  chain: Chain;
  api: ApiPromise;
};

const requestDelegateRegistryFx = createEffect(
  async ({ chain }: DelegateRegistryParams): Promise<DelegateAccount[]> => {
    const timestamp = Math.floor((Date.now() - MONTH) / 1000);
    const delegates = await delegationService.getDelegatesFromRegistry(chain);
    const stats = await delegationService.getDelegatesFromExternalSource(chain, timestamp);

    return delegationService.aggregateDelegateAccounts(delegates, stats, chain);
  },
);

sample({
  clock: requestDelegateRegistry,
  source: networkSelectorModel.$network,
  filter: nonNullable,
  target: requestDelegateRegistryFx,
});

sample({
  clock: requestDelegateRegistryFx.doneData,
  target: $delegateRegistry,
});

sample({
  clock: addDelegation,
  source: $delegateRegistry,
  fn: (delegates, { delegate, votes }) => {
    const newDelegates = [...delegates];

    const index = newDelegates.findIndex((d) => d.accountId === delegate.accountId);

    if (index === -1) {
      newDelegates.push({ ...delegate, delegatorVotes: votes.toString(), delegators: 1 });
    } else {
      newDelegates[index] = {
        ...delegate,
        delegatorVotes: votes.add(new BN(delegate.delegatorVotes)).toString(),
        delegators: delegate.delegators + 1,
      };
    }

    return newDelegates;
  },
  target: $delegateRegistry,
});

sample({
  clock: $delegateRegistry,
  source: {
    chain: networkSelectorModel.$governanceChain,
    identity: identity.$list,
  },
  filter: ({ chain }) => nonNullable(chain),
  fn: ({ chain, identity }, delegates) => {
    const accounts = new Set<AccountId>();

    for (const delegate of delegates) {
      if (nonNullable(delegate.name)) continue;

      if (nonNullable(identity[chain!.chainId]?.[delegate.accountId])) continue;

      accounts.add(delegate.accountId);
    }

    return {
      chainId: chain!.chainId,
      accounts: Array.from(accounts),
    };
  },
  target: identity.request,
});

export const delegateRegistryAggregate = {
  $delegateRegistry: readonly($delegateRegistry),
  $isRegistryLoading: requestDelegateRegistryFx.pending,

  events: {
    requestDelegateRegistry,
    addDelegation,
  },
};
