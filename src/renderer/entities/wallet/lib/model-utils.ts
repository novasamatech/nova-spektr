import { Account_NEW, ChainAccount } from '@shared/core';
import { accountUtils } from '@entities/wallet';

export const modelUtils = {
  groupAccounts,
};

type AccountsGroup = {
  base: Account_NEW[];
  chains: ChainAccount[][];
};
function groupAccounts(accounts: Omit<Account_NEW | ChainAccount, 'id' | 'walletId'>[]): AccountsGroup {
  return accounts.reduce<{ base: Account_NEW[]; chains: ChainAccount[][] }>(
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
