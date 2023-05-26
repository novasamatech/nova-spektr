import { groupBy } from 'lodash';

import { AccountDS } from '@renderer/services/storage';
import { useWallet } from '@renderer/services/wallet/walletService';
import { ChainsRecord, ChainWithAccounts, RootAccount, WalletStructure } from './types';
import { ChainId } from '@renderer/domain/shared-kernel';
import { includes } from '@renderer/shared/utils/strings';

export const useWalletsStructure = (
  paritySignerAccounts: AccountDS[],
  query: string,
  chains: ChainsRecord,
): WalletStructure[] => {
  const { getLiveWallets } = useWallet();

  const wallets = getLiveWallets();

  const getChainData = (chainId: ChainId, accounts: AccountDS[], rootAccount: AccountDS): ChainWithAccounts => {
    const chainAccounts = accounts.filter(
      (a) => a.rootId === rootAccount.id && (includes(a.name, query) || includes(a.accountId, query)),
    );

    return {
      ...chains[chainId as ChainId],
      accounts: chainAccounts,
    };
  };

  const getRootAccounts = (accounts: AccountDS[]): RootAccount[] => {
    const groupedRoots = groupBy(accounts, ({ chainId }) => chainId);

    const rootAccounts = accounts
      .filter((a) => !a.rootId)
      .map((rootAccount) => {
        const chains = Object.entries(groupedRoots)
          .map(([chainId, accounts]) => getChainData(chainId as ChainId, accounts, rootAccount))
          .filter((a) => a.accounts.length > 0);

        return {
          ...rootAccount,
          chains,
          amount: chains.reduce((acc, chain) => acc + chain.accounts.length, 1),
        };
      })
      .filter((a) => includes(a.name, query) || a.chains.length > 0);

    return rootAccounts;
  };

  return wallets
    .map((wallet) => {
      const accounts = paritySignerAccounts.filter((account) => account.walletId === wallet.id);
      const rootAccounts = getRootAccounts(accounts);

      return {
        ...wallet,
        amount: rootAccounts.reduce((acc, rootAccount) => acc + rootAccount.amount, 0),
        rootAccounts,
      };
    })
    .filter((a) => includes(a.name, query) || a.rootAccounts.length > 0);
};
