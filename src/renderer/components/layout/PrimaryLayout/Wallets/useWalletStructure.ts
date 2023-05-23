import { useEffect, useState } from 'react';
import { groupBy, keyBy } from 'lodash';

import { useAccount } from '@renderer/services/account/accountService';
import { AccountDS } from '@renderer/services/storage';
import { useWallet } from '@renderer/services/wallet/walletService';
import { ChainWithAccounts, RootAccount, WalletStructure } from './types';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain } from '@renderer/domain/chain';
import { includes } from '@renderer/shared/utils/strings';

export const useWalletsStructure = (accountQuery: Partial<AccountDS>, query: string): WalletStructure[] => {
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();
  const { getChainsData } = useChains();

  const [chainsObject, setChainsObject] = useState<Record<ChainId, Chain>>({});

  const wallets = getLiveWallets();
  const paritySignerAccounts = getLiveAccounts(accountQuery);

  useEffect(() => {
    getChainsData().then((chains) => setChainsObject(keyBy(chains, 'chainId')));
  }, []);

  const getChainData = (chainId: ChainId, accounts: AccountDS[], rootAccount: AccountDS): ChainWithAccounts => {
    const chainAccounts = accounts.filter(
      (a) => a.rootId === rootAccount.id && (includes(a.name, query) || includes(a.accountId, query)),
    );

    return {
      ...chainsObject[chainId as ChainId],
      isActive: chainAccounts.every((a) => a.isActive),
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
        isActive: rootAccounts.every((a) => a.isActive),
        amount: rootAccounts.reduce((acc, rootAccount) => acc + rootAccount.amount, 0),
        rootAccounts,
      };
    })
    .filter((a) => includes(a.name, query) || a.rootAccounts.length > 0);
};
