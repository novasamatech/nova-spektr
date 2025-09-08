import { type ChainId } from '@/shared/core';
import { createAsyncTaskPool } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService } from '../account/service';
import { type AnyAccount } from '../account/types';

import {
  type AccountProvider,
  type AccountProviderChain,
  type SyncedAccount,
  type SyncedMultisigAccount,
  type SyncedProxyAccount,
} from './types';

type InferProviderAccount<Provider extends AccountProvider<any>> =
  Provider extends AccountProvider<infer A> ? A : never;

type Params<Providers extends AccountProvider<any>[]> = {
  accounts: AnyAccount[];
  chains: Record<ChainId, AccountProviderChain>;
  providers: Providers;
};

type SyncResult<Providers extends AccountProvider<any>[]> = {
  accounts: InferProviderAccount<Providers[number]>[];
  chains: ChainId[];
};

async function syncAccounts<const Providers extends AccountProvider<any>[]>({
  accounts,
  chains,
  providers,
}: Params<Providers>): Promise<SyncResult<Providers>> {
  const possingAccounts = accounts.filter(accountService.hasPermissionToMakeActions);
  let foundAccounts: InferProviderAccount<Providers[number]>[] = [];
  const inputChains = Object.keys(chains) as ChainId[];

  if (possingAccounts.length === 0) {
    return {
      accounts: foundAccounts,
      chains: inputChains,
    };
  }

  const pool = createAsyncTaskPool({
    poolSize: 10,
    retryDelay: 0,
    retryCount: 5,
  });

  const initialAccountIds = possingAccounts.map(a => a.accountId);
  const foundAccountIds = new Set(initialAccountIds);

  const process = async (accounts: AccountId[]) => {
    const requests = providers.map(provider => pool.call(() => provider.fn(accounts, chains)));
    const searchResults = await Promise.all(requests).then(r => r.flat());

    const resultsIds = searchResults.map(a => a.accountId);
    const nextSearchCandidates = resultsIds.filter(a => !foundAccountIds.has(a));

    resultsIds.forEach(foundAccountIds.add, foundAccountIds);
    foundAccounts = foundAccounts.concat(searchResults);

    if (nextSearchCandidates.length > 0) {
      return process(nextSearchCandidates);
    }
  };

  await process(Array.from(foundAccountIds));

  return {
    accounts: foundAccounts,
    chains: inputChains,
  };
}

function isSyncedProxyAccount(a: SyncedAccount): a is SyncedProxyAccount {
  return 'type' in a && a.type === 'proxy';
}

function isSyncedMultisigAccount(a: SyncedAccount): a is SyncedMultisigAccount {
  return 'type' in a && a.type === 'multisig';
}

export const accountSyncService = {
  isSyncedProxyAccount,
  isSyncedMultisigAccount,

  syncAccounts: syncAccounts,
};
