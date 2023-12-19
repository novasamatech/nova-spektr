import { set } from 'lodash';

import type { Account, Chain, ChainId, BaseAccount, ChainAccount, ShardAccount, ID } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { toAddress, isStringsMatchQuery } from '@shared/lib/utils';
import { RootTuple, ChainsMap, ChainTuple, CheckedCounter, SelectedStruct } from './types';

export const shardsUtils = {
  getFilteredAccounts,
  getChainsAccountsMap: getChainsMap,
  getStructForVault,
  getStructForMultishard,
  getVaultChainsCounter,
  getMultishardtChainsCounter,
  isChecked,
  isUnchecked,
  isSemiChecked,
};

function getFilteredAccounts(accounts: Account[], chains: Record<ChainId, Chain>, query: string): Account[] {
  return accounts.filter((account) => {
    if (accountUtils.isBaseAccount(account)) return true;

    const address = toAddress(account.accountId, { prefix: chains[account.chainId].addressPrefix });

    return isStringsMatchQuery(query, [account.name, address]);
  });
}

function getChainsMap<T>(chains: Record<ChainId, Chain>): ChainsMap<T> {
  return Object.keys(chains).reduce<ChainsMap<T>>((acc, chainId) => {
    acc[chainId as ChainId] = {};

    return acc;
  }, {});
}

function getVaultChainsCounter(
  chains: Record<ChainId, Chain>,
  accounts: Array<BaseAccount | ChainAccount | ShardAccount>,
): SelectedStruct {
  const { baseId, root, shards } = accounts.reduce<{
    baseId: ID;
    root: SelectedStruct;
    shards: Array<ChainAccount | ShardAccount>;
  }>(
    (acc, account) => {
      if (accountUtils.isBaseAccount(account)) {
        acc.baseId = account.id;
        acc.root[account.id] = getChainCounter(chains);
        acc.root[account.id].checked = accounts.length;
        acc.root[account.id].total = accounts.length;
      } else {
        acc.shards.push(account);
      }

      return acc;
    },
    { baseId: 0, root: {}, shards: [] },
  );

  shards.forEach((shard) => {
    root[baseId][shard.chainId].checked += 1;
    root[baseId][shard.chainId].total += 1;
    root[baseId][shard.chainId].accounts[shard.accountId] = true;

    if (accountUtils.isShardAccount(shard)) {
      const existingGroup = root[baseId][shard.chainId].sharded[shard.groupId];
      if (existingGroup) {
        existingGroup.checked += 1;
        existingGroup.total += 1;
        existingGroup[shard.accountId] = true;
      } else {
        root[baseId][shard.chainId].sharded[shard.groupId] = { checked: 1, total: 1 };
        root[baseId][shard.chainId].sharded[shard.groupId][shard.accountId] = true;
      }
    }
  });

  return root;
}

function getMultishardtChainsCounter(
  chains: Record<ChainId, Chain>,
  accounts: Array<BaseAccount | ChainAccount>,
): SelectedStruct {
  const { roots, shards } = accounts.reduce<{
    roots: SelectedStruct;
    shards: Array<ChainAccount>;
  }>(
    (acc, account) => {
      if (accountUtils.isBaseAccount(account)) {
        acc.roots[account.id] = getChainCounter(chains);
        acc.roots[account.id].checked = accounts.length;
        acc.roots[account.id].total = accounts.length;
      } else {
        acc.shards.push(account);
      }

      return acc;
    },
    { roots: {}, shards: [] },
  );

  shards.forEach((shard) => {
    roots[shard.baseId!][shard.chainId].checked += 1;
    roots[shard.baseId!][shard.chainId].total += 1;
    roots[shard.baseId!][shard.chainId].accounts[shard.accountId] = true;
  });

  return roots;
}

function getChainCounter(chains: Record<ChainId, Chain>) {
  return Object.keys(chains).reduce<any>((acc, chainId) => {
    acc[chainId as ChainId] = {
      accounts: {},
      sharded: {},
      checked: 0,
      total: 0,
    };

    return acc;
  }, {});
}

function getStructForVault<T>(
  accounts: Array<BaseAccount | ChainAccount | ShardAccount>,
  chainsMap: ChainsMap<T>,
): RootTuple[] {
  let root: BaseAccount | undefined;

  accounts.forEach((account) => {
    if (accountUtils.isBaseAccount(account)) {
      root = account;
    }

    if (accountUtils.isChainAccount(account)) {
      const existingAccounts = chainsMap[account.chainId].accounts;
      if (existingAccounts) {
        existingAccounts.push(account as T);
      } else {
        chainsMap[account.chainId].accounts = [account as T];
      }
    }

    if (accountUtils.isShardAccount(account)) {
      const existingGroup = chainsMap[account.chainId][account.groupId];
      if (existingGroup) {
        existingGroup.push(account as T);
      } else {
        set(chainsMap[account.chainId], account.groupId, [account]);
      }
    }
  });

  if (!root) return [];

  const chainsTuples = Object.entries(chainsMap).reduce<ChainTuple[]>((acc, entries) => {
    const [chainId, { accounts = [], ...sharded }] = entries;
    const accountsGroup = [...accounts, ...Object.values(sharded)] as Array<ChainAccount | ShardAccount[]>;

    if (accountsGroup.length > 0) {
      acc.push([chainId as ChainId, accountsGroup]);
    }

    return acc;
  }, []);

  return [[root, chainsTuples]];
}

function getStructForMultishard<T>(accounts: Array<BaseAccount | ChainAccount>, chainsMap: ChainsMap<T>): RootTuple[] {
  const rootsMap: Record<ID, BaseAccount> = {};
  const roots: Map<BaseAccount, ChainTuple[]> = new Map();

  accounts.forEach((account) => {
    if (accountUtils.isBaseAccount(account)) {
      rootsMap[account.id] = account;
      roots.set(account, []);
    }

    if (accountUtils.isChainAccount(account)) {
      const existingChain = chainsMap[account.chainId];
      if (existingChain[account.baseId!]) {
        existingChain[account.baseId!].push(account as T);
      } else {
        chainsMap[account.chainId][account.baseId!] = [account as T];
      }
    }
  });

  if (!roots.size) return [];

  Object.entries(chainsMap).forEach(([chainId, rootTuples]) => {
    const tuples = Object.entries(rootTuples);

    if (tuples.length === 0) return;

    tuples.forEach(([baseId, accounts]) => {
      const chainTuples = roots.get(rootsMap[Number(baseId)]) as ChainTuple[];
      chainTuples.push([chainId as ChainId, accounts as any]);
    });
  });

  return [...roots.entries()];
}

function isChecked(object: CheckedCounter): boolean {
  return object.checked === object.total;
}

function isUnchecked(object: CheckedCounter): boolean {
  return object.total === 0;
}

function isSemiChecked(object: CheckedCounter): boolean {
  return object.checked > 0 && object.checked !== object.total;
}
