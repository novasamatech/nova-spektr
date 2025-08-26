import {
  type Chain,
  type ChainId,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { entries, isStringsMatchQuery, keys, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { type ChainTuple, type ChainsMap, type RootTuple, type SelectedStruct } from './types';

export const shardsUtils = {
  getFilteredAccounts,
  getChainsMap,
  getStructForVault,
  getVaultChainsCounter,
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
  return keys(chains).reduce<ChainsMap<T>>((acc, chainId) => {
    acc[chainId] = {};

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

  root[rootAccountId].checked = shards.length;
  root[rootAccountId].total = shards.length;

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

function getChainCounter(chains: Record<ChainId, Chain>) {
  return keys(chains).reduce<any>((acc, chainId) => {
    acc[chainId] = {
      accounts: {},
      sharded: {},
      checked: 0,
      total: 0,
    };

    return acc;
  }, {});
}

function getStructForVault(
  rootAccountId: AccountId,
  rootAccountName: string,
  accounts: AnyAccount[],
  chainsMap: ChainsMap<AnyAccount>,
): RootTuple[] {
  for (const account of accounts) {
    if (accountUtils.isVaultChainAccount(account)) {
      let group = chainsMap[account.chainId]['accounts'];
      if (!group) {
        group = [];
        chainsMap[account.chainId]['accounts'] = group;
      }
      group.push(account);
    }

    if (accountUtils.isVaultShardAccount(account)) {
      let group = chainsMap[account.chainId][account.groupId];
      if (!group) {
        group = [];
        chainsMap[account.chainId][account.groupId] = group;
      }
      group.push(account);
    }
  }

  const chainsTuples = entries(chainsMap).reduce<ChainTuple[]>((acc, entries) => {
    const [chainId, { accounts = [], ...sharded }] = entries;
    const accountsGroup = [...accounts, ...Object.values(sharded)] as (VaultChainAccount | VaultShardAccount[])[];

    if (accountsGroup.length > 0) {
      acc.push([chainId, accountsGroup]);
    }

    return acc;
  }, []);

  return [[rootAccountId, rootAccountName, chainsTuples]];
}

function getSelectedShards(struct: SelectedStruct, accounts: AnyAccount[]) {
  const selectedByChain = new Map<ChainId, Set<AccountId>>();

  for (const rootData of Object.values(struct)) {
    const { total: _total, checked: _checked, ...chains } = rootData;
    for (const [chainId, chainData] of entries(chains)) {
      const selected = new Set<AccountId>();

      for (const [accountId, isSelected] of entries(chainData.accounts)) {
        if (isSelected) {
          selected.add(accountId);
        }
      }

      for (const shardData of Object.values(chainData.sharded)) {
        const { total: _total, checked: _checked, ...shards } = shardData;

        for (const [accountId, isSelected] of entries(shards)) {
          if (isSelected) {
            selected.add(accountId);
          }
        }
      }

      selectedByChain.set(chainId as ChainId, selected);
    }
  }

  const selectedAccounts = Array.from(selectedByChain.values()).reduce((set, item) => {
    return new Set<AccountId>([...set, ...item]);
  }, new Set<AccountId>());

  return accounts.filter((account) => {
    if (accountService.isChainAccount(account)) {
      return selectedByChain.get(account.chainId)?.has(account.accountId) ?? false;
    }

    return selectedAccounts.has(account.accountId);
  });
}
