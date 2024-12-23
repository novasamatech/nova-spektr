import { type VaultBaseAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';

import { accountUtils } from './account-utils';

export const modelUtils = {
  groupAccounts,
};

type AccountsGroup = {
  base: VaultBaseAccount[];
  chains: VaultChainAccount[][];
  shards: VaultShardAccount[][];
};
function groupAccounts(
  accounts: (
    | Omit<VaultBaseAccount, 'id' | 'walletId'>
    | Omit<VaultChainAccount, 'id' | 'walletId'>
    | Omit<VaultShardAccount, 'id' | 'walletId'>
  )[],
) {
  return accounts.reduce<AccountsGroup>(
    (acc, account) => {
      const lastBaseIndex = acc.base.length - 1;

      if (accountUtils.isVaultBaseAccount(account)) {
        acc.base.push(account);
      }
      if (accountUtils.isVaultChainAccount(account)) {
        if (!acc.chains[lastBaseIndex]) {
          acc.chains[lastBaseIndex] = [];
        }
        acc.chains[lastBaseIndex].push(account);
      }
      if (accountUtils.isVaultShardAccount(account)) {
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
