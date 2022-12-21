import { useEffect, useState } from 'react';
import { groupBy, keyBy } from 'lodash';

import { useAccount } from '@renderer/services/account/accountService';
import { AccountDS } from '@renderer/services/storage';
import { useWallet } from '@renderer/services/wallet/walletService';
import { WalletStructure } from './types';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain } from '@renderer/domain/chain';

export const useWalletsStructure = (accountQuery: Partial<AccountDS>, query: string): WalletStructure[] => {
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();

  const { getChainsData } = useChains();
  const [chainsObject, setChainsObject] = useState<Record<string, Chain>>({});

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChainsObject(keyBy(chains, 'chainId'));
    })();
  }, []);

  const wallets = getLiveWallets();
  const paritySignerAccounts = getLiveAccounts(accountQuery);

  const walletStructure = wallets.map((wallet) => {
    const accounts = paritySignerAccounts.filter((account) => account.walletId === wallet.id);
    const rootAccounts = accounts.filter((a) => !a.rootId && a.name.includes(query));

    const groupedRoots = groupBy(accounts, ({ chainId }) => chainId);

    return {
      ...wallet,
      isActive: accounts.every((a) => a.isActive),
      rootAccounts: rootAccounts.map((account) => ({
        ...account,
        chains: Object.entries(groupedRoots)
          .map(([chainId, accounts]) => {
            const chainAccounts = accounts.filter((a) => a.rootId === account.id && a.name.includes(query));

            return {
              ...chainsObject[chainId as ChainId],
              isActive: chainAccounts.every((a) => a.isActive),
              accounts: chainAccounts,
            };
          })
          .filter((a) => a.accounts.length > 0),
      })),
    };
  });

  return walletStructure;
};
