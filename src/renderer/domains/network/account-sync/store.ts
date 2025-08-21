import { attach } from 'effector';

import { type ChainId } from '@/shared/core';
import { entries, nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { type AnyAccount } from '../account/types';

import { multisigAccountsProvider, proxyAccountsProvider } from './resource';
import { accountSyncService } from './service';
import { type AccountProviderChain } from './types';

type SyncParams = {
  accounts: AnyAccount[];
};

export const syncAccountsFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  effect: ({ chains, apis }, { accounts }: SyncParams) => {
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
