import { groupBy } from 'lodash';

import { Account, AccountId, ChainAccount, ChainId, ShardAccount } from '@shared/core';
import { ChainMap } from '@entities/network';
import {
  ChainData,
  ChainWithAccounts,
  RootData,
  SelectedAccounts,
  SelectedData,
  ShardedData,
  ShardsTree,
} from './types';
import { accountUtils } from '@entities/wallet';

export const selectShardsUtils = {
  getShardsTreeStructure,
  getSelectedAccounts,
  getChainsData,
  getRootData,
  getShardedData,
};

function getShardsTreeStructure(accounts: Account[], chains: ChainMap): ShardsTree {
  const rootAccount = accounts.filter(accountUtils.isBaseAccount);

  return rootAccount.map((root) => {
    const chainAccountMap: Record<ChainId, Array<ChainAccount | ShardAccount[]>> = {};
    const chainAccount = accounts.filter(
      (a) => accountUtils.isChainAccount(a) && a.baseId === root.id,
    ) as ChainAccount[];
    const shardAccounts = groupBy(accounts.filter(accountUtils.isShardAccount), 'groupId');
    chainAccount.forEach((a) => {
      if (chainAccountMap[a.chainId]) {
        chainAccountMap[a.chainId].push(a);
      } else {
        chainAccountMap[a.chainId] = [a];
      }
    });

    for (let shardAccountGroupId in shardAccounts) {
      const firstShardAcoount = shardAccounts[shardAccountGroupId][0];
      if (chainAccountMap[firstShardAcoount.chainId]) {
        chainAccountMap[firstShardAcoount.chainId].push(shardAccounts[shardAccountGroupId]);
      } else {
        chainAccountMap[firstShardAcoount.chainId] = [shardAccounts[shardAccountGroupId]];
      }
    }

    const chainAccountsTuples: ChainWithAccounts[] = Object.entries(chainAccountMap).map(([chainId, a]) => [
      chains[chainId as ChainId],
      a,
    ]);

    return [root, chainAccountsTuples];
  });
}

function getSelectedAccounts(accounts: Account[], activeAccounts: Account[]): SelectedAccounts {
  const activeAccountsIds = activeAccounts.map((a) => a.accountId);

  return accounts.reduce((acc, a) => {
    // @ts-ignore
    acc[`${a.accountId}_${a.name}`] = activeAccountsIds.includes(a.accountId);

    return acc;
  }, {});
}

function getRootData(accounts: Account[], activeAccounts: Account[]): RootData {
  const activeAccountsIds = activeAccounts.map((a) => a.accountId);
  const roots = accounts.filter(accountUtils.isBaseAccount);

  return roots.reduce((acc, root) => {
    const rootAccounts = accounts.filter((a) => 'baseId' in a && a.baseId === root.id);
    const rootData: SelectedData = {
      total: rootAccounts.length,
      checked: rootAccounts.filter((a) => activeAccountsIds.includes(a.accountId)).length,
    };

    // @ts-ignore
    acc[root.accountId] = rootData;

    return acc;
  }, {});
}

function getChainsData(accounts: Account[], activeAccounts: Account[]): ChainData {
  const activeAccountsIds = activeAccounts.map((a) => a.accountId);
  const roots = accounts.filter(accountUtils.isBaseAccount);

  const chainData: ChainData = {};

  roots.forEach((root) => {
    const rootAccounts = accounts.filter((a) => ('baseId' in a && a.baseId === root.id) || 'groupId' in a);
    const rootAccountsByChain = groupBy(rootAccounts, 'chainId');
    for (let chainId in rootAccountsByChain) {
      const selectedData: SelectedData = {
        total: rootAccountsByChain[chainId].length,
        checked: rootAccountsByChain[chainId].filter((a) => activeAccountsIds.includes(a.accountId)).length,
      };

      chainData[`${root.accountId as AccountId}_${chainId as ChainId}`] = selectedData;
    }
  });

  return chainData;
}

function getShardedData(accounts: Account[], activeAccounts: Account[]): ChainData {
  const activeAccountsIds = activeAccounts.map((a) => a.accountId);
  const shards = accounts.filter(accountUtils.isShardAccount);
  const grouppedShards = groupBy(shards, 'groupdId');

  const shardedData: ShardedData = {};

  for (let groupdId in grouppedShards) {
    const selectedData: SelectedData = {
      total: grouppedShards[groupdId].length,
      checked: grouppedShards[groupdId].filter((a) => activeAccountsIds.includes(a.accountId)).length,
    };

    // @ts-ignore
    shardedData[`${grouppedShards[groupdId][0].chainId}_${groupdId}`] = selectedData;
  }

  return shardedData;
}
