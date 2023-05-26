import { groupBy } from 'lodash';

import { AccountDS } from '@renderer/services/storage';
import {
  ChainsRecord,
  ChainWithAccounts,
  MultishardStructure,
  RootAccount,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { ChainId } from '@renderer/domain/shared-kernel';

const getRootAccount = (accounts: AccountDS[], chains: ChainsRecord, root: AccountDS): RootAccount => {
  const accountsByChain = groupBy(accounts, ({ chainId }) => chainId);
  const chainAccounts: ChainWithAccounts[] = Object.entries(accountsByChain).map(([chainId, accounts]) => ({
    ...chains[chainId as ChainId],
    accounts,
  }));

  return {
    ...root,
    chains: chainAccounts,
    amount: chainAccounts.reduce((acc, chain) => acc + chain.accounts.length, 1),
  };
};

export const getWalletStructure = (
  accounts: AccountDS[],
  chains: ChainsRecord,
  walletId: string,
): MultishardStructure => {
  const walletAccounts = accounts.filter((a) => a.walletId === walletId);
  const rootAccounts = walletAccounts
    .filter((a) => !a.rootId)
    .map((root) => getRootAccount(walletAccounts, chains, root));

  return {
    amount: rootAccounts.reduce((acc, rootAccount) => acc + rootAccount.amount, 0),
    rootAccounts,
  };
};
