import { groupBy } from 'lodash';

import { Account, BaseAccount, ChainAccount } from '@shared/core';
import { ChainMap } from '@entities/network';
import { ChainWithAccounts, MultishardStructure, RootAccount, SelectableShards } from './types';
import { accountUtils } from '@entities/wallet';
import { isStringsMatchQuery } from '@shared/lib/utils';

export const selectShardsUtils = {
  getMultishardStructure,
  getSelectableShards,
  searchShards,
};

function getBaseAccountGroup(base: BaseAccount, accounts: ChainAccount[], chains: ChainMap): RootAccount {
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
}

function getMultishardStructure(accounts: Account[], chains: ChainMap): MultishardStructure {
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
}

function getSelectableShards(multishard: MultishardStructure, ids: Account['id'][]): SelectableShards {
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
}

function searchShards(shards: SelectableShards, query: string): SelectableShards {
  const rootAccounts = shards.rootAccounts.map((root) => {
    const chains = root.chains.map((chain) => ({
      ...chain,
      accounts: chain.accounts.filter((a) => isStringsMatchQuery(query, [a.name, a.accountId])),
    }));

    return {
      ...root,
      chains: chains.filter((c) => c.accounts.length),
    };
  });

  return {
    ...shards,
    rootAccounts: rootAccounts.filter(
      (root) => isStringsMatchQuery(query, [root.name, root.accountId]) || root.chains.length,
    ),
  };
}
