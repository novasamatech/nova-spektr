import { attach } from 'effector';

import { type ChainId } from '@/shared/core';
import { entries, nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { accounts } from '../account/store';

import { multisigAccountsProvider, proxyAccountsProvider } from './resource';
import { accountSyncService } from './service';
import { type AccountProviderChain } from './types';

export const syncAccountsFx = attach({
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  effect: ({ chains, apis, accounts }) => {
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
      providers: [proxyAccountsProvider, multisigAccountsProvider],
    });
  },
});

export const accountSync = {
  syncAccounts: syncAccountsFx,
};
