import set from 'lodash/set';

import {
  type Account,
  type AccountId,
  type BaseAccount,
  type Chain,
  type ChainAccount,
  type ChainId,
  type ID,
  type ShardAccount,
} from '@/shared/core';
import { isStringsMatchQuery, toAddress } from '@/shared/lib/utils';
import { accountUtils } from '@/entities/wallet';

import { type ChainTuple, type ChainsMap, type RootTuple, type SelectedStruct } from './types';

export const shardsUtils = {
  getFilteredAccounts,
  getChainsMap,
  getStructForVault,
  getStructForMultishard,
  getVaultChainsCounter,
  getMultishardtChainsCounter,
  getSelectedShards,
};

function getFilteredAccounts(
  accounts: (BaseAccount | ChainAccount | ShardAccount)[],
  chains: Record<ChainId, Chain>,
  query = '',
): Account[] {
  return accounts.filter((account) => {
    if (accountUtils.isBaseAccount(account)) return true;
    if (!chains[account.chainId]) return false;

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

function getVaultChainsCounter(chains: Record<ChainId, Chain>, accounts: Account[]): SelectedStruct {
  const { baseId, root, shards } = accounts.reduce<{
    baseId: ID;
    root: SelectedStruct;
    shards: (ChainAccount | ShardAccount)[];
  }>(
    (acc, account) => {
      if (accountUtils.isBaseAccount(account)) {
        const nonBaseAccounts = accounts.filter((acc) => !accountUtils.isBaseAccount(acc));

        acc.baseId = account.id;
        acc.root[account.id] = getChainCounter(chains);
        acc.root[account.id].checked = nonBaseAccounts.length;
        acc.root[account.id].total = nonBaseAccounts.length;
      } else {
        acc.shards.push(account as ChainAccount | ShardAccount);
      }

      return acc;
    },
    { baseId: 0, root: {}, shards: [] },
  );

  for (const shard of shards) {
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
  }

  return root;
}

function getMultishardtChainsCounter(chains: Record<ChainId, Chain>, accounts: Account[]): SelectedStruct {
  const { roots, shards } = accounts.reduce<{
    roots: SelectedStruct;
    shards: ChainAccount[];
  }>(
    (acc, account) => {
      if (accountUtils.isBaseAccount(account)) {
        acc.roots[account.id] = getChainCounter(chains);
        acc.roots[account.id].checked = 0;
        acc.roots[account.id].total = 0;
      } else {
        acc.shards.push(account as ChainAccount);
      }

      return acc;
    },
    { roots: {}, shards: [] },
  );

  for (const shard of shards) {
    const root = roots[shard.baseId!];
    root.checked += 1;
    root.total += 1;
    root[shard.chainId].checked += 1;
    root[shard.chainId].total += 1;
    root[shard.chainId].accounts[shard.accountId] = true;
  }

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

function getStructForVault<T>(accounts: Account[], chainsMap: ChainsMap<T>): RootTuple[] {
  let root: BaseAccount | undefined;

  for (const account of accounts) {
    if (accountUtils.isBaseAccount(account)) {
      root = account;
    }

    if (accountUtils.isChainAccount(account)) {
      const existingAccounts = chainsMap[account.chainId].accounts;
      if (existingAccounts) {
        existingAccounts.push(account as T);
      } else {
        set(chainsMap[account.chainId], 'accounts', [account]);
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
  }

  if (!root) return [];

  const chainsTuples = Object.entries(chainsMap).reduce<ChainTuple[]>((acc, entries) => {
    const [chainId, { accounts = [], ...sharded }] = entries;
    const accountsGroup = [...accounts, ...Object.values(sharded)] as (ChainAccount | ShardAccount[])[];

    if (accountsGroup.length > 0) {
      acc.push([chainId as ChainId, accountsGroup]);
    }

    return acc;
  }, []);

  return [[root, chainsTuples]];
}

function getStructForMultishard<T>(accounts: Account[], chainsMap: ChainsMap<T>): RootTuple[] {
  const rootsMap: Record<ID, BaseAccount> = {};
  const roots: Map<BaseAccount, ChainTuple[]> = new Map();

  for (const account of accounts) {
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
  }

  if (!roots.size) return [];

  for (const [chainId, rootTuples] of Object.entries(chainsMap)) {
    const tuples = Object.entries(rootTuples);

    if (tuples.length === 0) continue;

    for (const [baseId, accounts] of tuples) {
      const chainTuples = roots.get(rootsMap[Number(baseId)]);
      if (chainTuples) {
        chainTuples.push([chainId as ChainId, accounts as never]);
      }
    }
  }

  return [...roots.entries()];
}

function getSelectedShards(struct: SelectedStruct, accounts: Account[]): BaseAccount[] {
  const selectedMap = Object.values(struct).reduce<Record<AccountId, boolean>>((acc, chainMap) => {
    const { total: _total, checked: _checked, ...chains } = chainMap;

    for (const chain of Object.values(chains)) {
      const { accounts, sharded = {} } = chain;
      Object.assign(acc, accounts);

      for (const shard of Object.values(sharded)) {
        const { total: _total, checked: _checked, ...shards } = shard;
        Object.assign(acc, shards);
      }
    }

    return acc;
  }, {});

  return accounts.filter((account): account is BaseAccount => selectedMap[account.accountId]);
}
