import { set } from 'lodash';

import type { Account, Chain, ChainId, BaseAccount, ChainAccount, ShardAccount, ID } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { toAddress, isStringsMatchQuery } from '@shared/lib/utils';
import { RootTuple, ChainsMap, ChainTuple } from './types';

export const shardsUtils = {
  getFilteredAccounts,
  getChainsAccountsMap,
  getStructForVault,
  getStructForMultishard,
};

function getFilteredAccounts(accounts: Account[], chains: Record<ChainId, Chain>, query: string): Account[] {
  return accounts.filter((account) => {
    if (accountUtils.isBaseAccount(account)) return true;

    const address = toAddress(account.accountId, { prefix: chains[account.chainId].addressPrefix });

    return isStringsMatchQuery(query, [account.name, address]);
  });
}

function getChainsAccountsMap<T>(chains: Record<ChainId, Chain>): ChainsMap<T> {
  return Object.keys(chains).reduce<ChainsMap<T>>((acc, chainId) => {
    acc[chainId as ChainId] = {};

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
