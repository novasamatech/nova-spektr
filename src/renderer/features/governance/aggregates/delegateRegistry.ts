import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import { MONTH, getBlockTimeAgo, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identityDomain } from '@/domains/identity';
import { networkSelectorModel } from '../model/networkSelector';

const requestDelegateRegistry = createEvent();
const addDelegation = createEvent<{ delegate: DelegateAccount; votes: BN }>();

const $delegateRegistry = createStore<DelegateAccount[]>([]);

type DelegateRegistryParams = {
  chain: Chain;
  api: ApiPromise;
};

const requestDelegateRegistryFx = createEffect(
  async ({ chain, api }: DelegateRegistryParams): Promise<DelegateAccount[]> => {
    const blockNumber = await getBlockTimeAgo(MONTH, api);
    const delegates = await delegationService.getDelegatesFromRegistry(chain);
    const stats = await delegationService.getDelegatesFromExternalSource(chain, blockNumber);

    return delegationService.aggregateDelegateAccounts(delegates, stats);
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
    identity: identityDomain.identity.$list,
  },
  filter: ({ chain }, delegates) => {
    if (nullable(chain)) return false;

    return delegates.some((delegate) => nullable(delegate.name));
  },
  fn: ({ chain, identity }, delegates) => {
    const accounts = new Set<AccountId>();

    for (const delegate of delegates) {
      if (nonNullable(delegate.name)) continue;

      const accountId = toAccountId(delegate.address ?? delegate.accountId);
      if (nonNullable(identity[chain!.chainId]?.[accountId])) continue;

      accounts.add(accountId);
    }

    return {
      chainId: chain!.chainId,
      accounts: Array.from(accounts),
    };
  },
  target: identityDomain.identity.request,
});

export const delegateRegistryAggregate = {
  $delegateRegistry: readonly($delegateRegistry),
  $isRegistryLoading: requestDelegateRegistryFx.pending,

  events: {
    requestDelegateRegistry,
    addDelegation,
  },
};
