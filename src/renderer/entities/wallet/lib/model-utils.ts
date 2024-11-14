import { type BaseAccount, type ChainAccount, type ShardAccount } from '@/shared/core';

import { accountUtils } from './account-utils';

export const modelUtils = {
  groupAccounts,
};

type AccountsGroup = {
  base: BaseAccount[];
  chains: ChainAccount[][];
  shards: ShardAccount[][];
};
function groupAccounts(accounts: Omit<BaseAccount | ChainAccount | ShardAccount, 'id' | 'walletId'>[]) {
  return accounts.reduce<AccountsGroup>(
    (acc, account) => {
      const lastBaseIndex = acc.base.length - 1;

      if (accountUtils.isBaseAccount(account)) {
        acc.base.push(account);
      }
      if (accountUtils.isChainAccount(account)) {
        if (!acc.chains[lastBaseIndex]) {
          acc.chains[lastBaseIndex] = [];
        }
        acc.chains[lastBaseIndex].push(account);
      }
      if (accountUtils.isShardAccount(account)) {
        if (!acc.shards[lastBaseIndex]) {
          acc.shards[lastBaseIndex] = [];
        }
        acc.shards[lastBaseIndex].push(account);
      }

      return acc;
    },
    { base: [], chains: [], shards: [] },
  );
}
