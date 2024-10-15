import { type BaseAccount, type ChainAccount } from '@/shared/core';

import { accountUtils } from './account-utils';

export const modelUtils = {
  groupAccounts,
};

type AccountsGroup = {
  base: BaseAccount[];
  chains: ChainAccount[][];
};
function groupAccounts(accounts: Omit<BaseAccount | ChainAccount, 'id' | 'walletId'>[]): AccountsGroup {
  return accounts.reduce<{ base: BaseAccount[]; chains: ChainAccount[][] }>(
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

      return acc;
    },
    { base: [], chains: [] },
  );
}
