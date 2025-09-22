import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEvent, sample } from 'effector';
import { once } from 'patronum/once';

import { type Chain, type ChainId } from '@/shared/core';
import { takeLast } from '@/shared/effector';
import { entries, nullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accounts } from '../account/store';
import { type AnyAccount } from '../account/types';

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
  effect: takeLast({
    fn: async ({
      chains,
      apis,
      accounts,
    }: {
      chains: Record<ChainId, Chain>;
      apis: Record<ChainId, ApiPromise>;
      accounts: AnyAccount[];
    }) => {
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
    key: () => 'accountSync',
  }),
});

const $supportedChainIds = combine(
  {
    chains: networkModel.$chains,
  },
  ({ chains: chainsMap }) => {
    const chains = Object.values(chainsMap);

    const chainIds = new Set<ChainId>();

    for (const provider of accountsProviders) {
      for (const chain of provider.getSupportedChains(chains)) {
        chainIds.add(chain.chainId);
      }
    }

    return Array.from(chainIds);
  },
);

const $isAllNetworksConnected = combine(
  {
    statuses: networkModel.$connectionStatuses,
    chainIds: $supportedChainIds,
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
