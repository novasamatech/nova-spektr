import set from 'lodash/set';

import {
  type Account,
  type Chain,
  type ChainId,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { entries, isStringsMatchQuery, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';

import { type ChainTuple, type ChainsMap, type RootTuple, type SelectedStruct } from './types';

export const shardsUtils = {
  getFilteredAccounts,
  getChainsMap,
  getStructForVault,
  getStructForMultishard,
  getVaultChainsCounter,
  getMultishardChainsCounter,
  getSelectedShards,
};

function getFilteredAccounts(
  accounts: (VaultBaseAccount | VaultChainAccount | VaultShardAccount)[],
  chains: Record<ChainId, Chain>,
  query = '',
): (VaultChainAccount | VaultShardAccount)[] {
  return accounts
    .filter((a) => accountUtils.isVaultChainAccount(a) || accountUtils.isVaultShardAccount(a))
    .filter((account) => {
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

function getVaultChainsCounter(
  rootAccountId: AccountId,
  chains: Record<ChainId, Chain>,
  shards: (VaultChainAccount | VaultShardAccount)[],
): SelectedStruct {
  const root: SelectedStruct = {
    [rootAccountId]: getChainCounter(chains),
  };

  for (const shard of shards) {
    root[rootAccountId][shard.chainId].checked += 1;
    root[rootAccountId][shard.chainId].total += 1;
    root[rootAccountId][shard.chainId].accounts[shard.accountId] = true;

    if (accountUtils.isVaultShardAccount(shard)) {
      const existingGroup = root[rootAccountId][shard.chainId].sharded[shard.groupId];
      if (existingGroup) {
        existingGroup.checked += 1;
        existingGroup.total += 1;
        existingGroup[shard.accountId] = true;
      } else {
        root[rootAccountId][shard.chainId].sharded[shard.groupId] = { checked: 1, total: 1 };
        root[rootAccountId][shard.chainId].sharded[shard.groupId][shard.accountId] = true;
      }
    }
  }

  return root;
}

function getMultishardChainsCounter(
  rootAccountId: AccountId,
  chains: Record<ChainId, Chain>,
  shards: (VaultChainAccount | VaultShardAccount)[],
): SelectedStruct {
  const roots: SelectedStruct = {
    [rootAccountId]: getChainCounter(chains),
  };

  roots[rootAccountId] = getChainCounter(chains);

  for (const shard of shards) {
    const root = roots[shard.accountId];

    if (nullable(root)) continue;

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
  let root: VaultBaseAccount | undefined;

  for (const account of accounts) {
    if (accountUtils.isVaultBaseAccount(account)) {
      root = account;
    }

    if (accountUtils.isVaultChainAccount(account)) {
      const existingAccounts = chainsMap[account.chainId].accounts;
      if (existingAccounts) {
        existingAccounts.push(account as T);
      } else {
        set(chainsMap[account.chainId], 'accounts', [account]);
      }
    }

    if (accountUtils.isVaultShardAccount(account)) {
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
    const accountsGroup = [...accounts, ...Object.values(sharded)] as (VaultChainAccount | VaultShardAccount[])[];

    if (accountsGroup.length > 0) {
      acc.push([chainId as ChainId, accountsGroup]);
    }

    return acc;
  }, []);

  return [[root, chainsTuples]];
}

function getStructForMultishard<T>(accounts: Account[], chainsMap: ChainsMap<T, AccountId>): RootTuple[] {
  const rootsMap: Record<AccountId, VaultBaseAccount> = {};
  const roots: Map<VaultBaseAccount, ChainTuple[]> = new Map();

  for (const account of accounts) {
    if (accountUtils.isVaultBaseAccount(account)) {
      rootsMap[account.accountId] = account;
      roots.set(account, []);
    }

    if (accountUtils.isVaultChainAccount(account)) {
      const existingChain = chainsMap[account.chainId];
      if (existingChain[account.baseAccountId!]) {
        existingChain[account.baseAccountId!].push(account as T);
      } else {
        chainsMap[account.chainId][account.baseAccountId!] = [account as T];
      }
    }
  }

  if (!roots.size) return [];

  for (const [chainId, rootTuples] of entries(chainsMap)) {
    const tuples = entries(rootTuples);

    if (tuples.length === 0) continue;

    for (const [baseId, accounts] of tuples) {
      const chainTuples = roots.get(rootsMap[baseId]);
      if (chainTuples) {
        chainTuples.push([chainId as ChainId, accounts as never]);
      }
    }
  }

  return [...roots.entries()];
}

function getSelectedShards(struct: SelectedStruct, accounts: Account[]): VaultBaseAccount[] {
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

  return accounts.filter((account): account is VaultBaseAccount => selectedMap[account.accountId]);
}
