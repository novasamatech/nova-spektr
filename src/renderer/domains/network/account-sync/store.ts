import { attach, combine, createEvent, sample } from 'effector';
import { once } from 'patronum/once';

import { type ChainId } from '@/shared/core';
import { entries, nullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accounts } from '../account/store';

import { indexedBlocksProvider, multisigAccountsProvider, proxyAccountsProvider } from './resource';
import { accountSyncService } from './service';
import { type AccountProviderChain } from './types';

const accountsProviders = [proxyAccountsProvider, multisigAccountsProvider];

export const syncAccountsFx = attach({
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  effect: async ({ chains, apis, accounts }) => {
    const chainsToSync: Record<ChainId, AccountProviderChain> = {};

    for (const [chainId, chain] of entries(chains)) {
      const api = apis[chainId];
      if (nullable(api)) continue;
      chainsToSync[chainId] = {
        api,
        chain,
      };
    }

    return accountSyncService.syncAccounts({
      accounts,
      chains: chainsToSync,
      accountsProviders,
      indexedBlocksProvider,
    });
  },
});

const $avaialableChainIds = combine(
  {
    chains: networkModel.$chains,
  },
  ({ chains }) => {
    const availableChains = new Set<ChainId>();
    for (const provider of accountsProviders) {
      for (const chain of provider.getAvailableChains(Object.values(chains))) {
        availableChains.add(chain.chainId);
      }
    }
    return Array.from(availableChains);
  },
);

const $isAllNetworksConnected = combine(
  {
    statuses: networkModel.$connectionStatuses,
    chainIds: $avaialableChainIds,
  },
  ({ statuses, chainIds }) => {
    return chainIds.every(chainId => {
      const status = statuses[chainId];
      if (nullable(status)) return false;

      return networkUtils.isConnectedStatus(status);
    });
  },
);

const networksConnected = createEvent();

sample({
  clock: $isAllNetworksConnected,
  filter: Boolean,
  target: networksConnected,
});

sample({
  clock: once(networksConnected),
  target: syncAccountsFx,
});

export const accountSync = {
  syncAccounts: syncAccountsFx,
};
