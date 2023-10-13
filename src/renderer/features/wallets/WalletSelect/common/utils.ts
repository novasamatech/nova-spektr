import { groupBy } from 'lodash';

import {
  ChainsRecord,
  ChainWithAccounts,
  MultishardStructure,
  MultishardWallet,
  RootAccount,
  SelectableShards,
  WalletGroupItem,
} from './types';
import { includes } from '@renderer/shared/lib/utils';
import { accountUtils } from '@renderer/entities/wallet';
import type { Account, BaseAccount, ChainAccount } from '@renderer/shared/core';

const getBaseAccountGroup = (base: BaseAccount, accounts: ChainAccount[], chains: ChainsRecord): RootAccount => {
  const accountsByChain = groupBy(accounts, ({ chainId }) => chainId);

  // iterate by chain and not the account to preserve chains order (if sorted)
  const chainAccounts = Object.values(chains).reduce<ChainWithAccounts[]>((acc, chain) => {
    if (accountsByChain[chain.chainId]) {
      acc.push({ ...chain, accounts: accountsByChain[chain.chainId] });
    }

    return acc;
  }, []);

  // start with 1 because we want to count root acc as well
  const accountsAmount = chainAccounts.reduce((acc, chain) => acc + chain.accounts.length, 1);

  return {
    ...base,
    chains: chainAccounts,
    amount: accountsAmount,
  };
};

export const getMultishardStructure = (accounts: Account[], chains: ChainsRecord): MultishardStructure => {
  const chainAccounts = accounts.filter(accountUtils.isChainAccount);

  const rootAccounts = accounts.reduce<RootAccount[]>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) {
      acc.push(getBaseAccountGroup(account, chainAccounts, chains));
    }

    return acc;
  }, []);

  const accountsAmount = rootAccounts.reduce((acc, root) => acc + root.amount, 0);

  return {
    rootAccounts,
    amount: accountsAmount,
  };
};

export const getSelectableShards = (multishard: MultishardStructure, ids: Account['id'][]): SelectableShards => {
  const rootAccounts = multishard.rootAccounts.map((root) => {
    const chains = root.chains.map((chain) => {
      const accounts = chain.accounts.map((a) => ({ ...a, isSelected: ids.includes(a.id) }));
      const selectedAccounts = accounts.filter((a) => a.isSelected);

      return {
        ...chain,
        accounts,
        isSelected: selectedAccounts.length === accounts.length,
        selectedAmount: selectedAccounts.length,
      };
    });

    return {
      ...root,
      chains,
      isSelected: ids.includes(root.id),
      selectedAmount: chains.filter((c) => c.isSelected).length,
    };
  });

  return { ...multishard, rootAccounts };
};

export const searchShards = (shards: SelectableShards, query: string): SelectableShards => {
  const rootAccounts = shards.rootAccounts.map((root) => {
    const chains = root.chains.map((chain) => ({
      ...chain,
      accounts: chain.accounts.filter((a) => includes(a.name, query) || includes(a.accountId, query)),
    }));

    return {
      ...root,
      chains: chains.filter((c) => c.accounts.length),
    };
  });

  return {
    ...shards,
    rootAccounts: rootAccounts.filter(
      (root) => includes(root.accountId, query) || includes(root.name, query) || root.chains.length,
    ),
  };
};

export const isMultishardWalletItem = (wallet: WalletGroupItem): wallet is MultishardWallet => {
  return 'rootAccounts' in wallet;
};
