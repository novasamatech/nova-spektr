import { groupBy } from 'lodash';

import { AccountDS } from '@renderer/shared/api/storage';
import {
  ChainsRecord,
  ChainWithAccounts,
  MultishardStructure,
  MultishardWallet,
  RootAccount,
  SelectableShards,
  WalletGroupItem,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { includes } from '@renderer/shared/lib/utils';

const getRootAccount = (accounts: AccountDS[], chains: ChainsRecord, root: AccountDS): RootAccount => {
  const accountsByChain = groupBy(
    accounts.filter((a) => a.rootId === root.id),
    ({ chainId }) => chainId,
  );

  // iterate by chain and not the account to preserve chains order (if sorted)
  const chainAccounts: ChainWithAccounts[] = Object.values(chains)
    .filter((chain) => accountsByChain[chain.chainId])
    .map((chain) => ({ ...chain, accounts: accountsByChain[chain.chainId] }));

  return {
    ...root,
    chains: chainAccounts,
    amount: chainAccounts.reduce((acc, chain) => acc + chain.accounts.length, 1), // start with 1 because we want to count root acc as well
  };
};

export const getMultishardStructure = (
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

export const getWalletConnectStructure = (accounts: AccountDS[], walletId: string): MultishardStructure => {
  const walletAccounts = accounts.filter((a) => a.walletId === walletId);

  return {
    amount: walletAccounts.length,
    rootAccounts: walletAccounts as RootAccount[],
  };
};

export const getSelectableShards = (multishard: MultishardStructure, selectedIds: string[]): SelectableShards => {
  return {
    ...multishard,
    rootAccounts: multishard.rootAccounts.map((r) => {
      const chains = r.chains.map((c) => {
        const accounts = c.accounts.map((a) => ({ ...a, isSelected: selectedIds.includes(a.id || '') }));
        const selectedAccounts = accounts.filter((a) => a.isSelected);

        return {
          ...c,
          accounts: accounts,
          isSelected: selectedAccounts.length === accounts.length,
          selectedAmount: selectedAccounts.length,
        };
      });

      return {
        ...r,
        isSelected: selectedIds.includes(r.id || ''),
        chains: chains,
        selectedAmount: chains.filter((c) => c.isSelected).length,
      };
    }),
  };
};

export const searchShards = (shards: SelectableShards, query: string): SelectableShards => {
  const rootAccounts = shards.rootAccounts.map((r) => {
    const chains = r.chains.map((c) => ({
      ...c,
      accounts: c.accounts.filter((a) => includes(a.name, query) || includes(a.accountId, query)),
    }));

    return {
      ...r,
      chains: chains.filter((c) => c.accounts.length),
    };
  });

  return {
    ...shards,
    rootAccounts: rootAccounts.filter(
      (r) => includes(r.accountId, query) || includes(r.name, query) || r.chains.length,
    ),
  };
};

export const isMultishardWalletItem = (wallet: WalletGroupItem): wallet is MultishardWallet => {
  return 'rootAccounts' in wallet;
};
