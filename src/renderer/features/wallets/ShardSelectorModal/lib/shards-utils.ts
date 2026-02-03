import { chainsService } from '@/shared/api/network';
import {
  type Chain,
  type ChainId,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { entries, isStringsMatchQuery, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

import { type ChainTuple, type RootStruct, type SelectedStruct } from './types';

const EVM_GROUP_ID = 'evm' as const;

const getConsensusChainId = (chain: Chain): ChainId | typeof EVM_GROUP_ID => {
  return networkUtils.isEthereumBased(chain.options) ? EVM_GROUP_ID : (chain.parentId ?? chain.chainId);
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

      return isStringsMatchQuery(query, [account.derivationPath, address]);
    });
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
    const chain = chains[shard.chainId];
    const chainId = getConsensusChainId(chain);
    root[rootAccountId][chainId].checked += 1;
    root[rootAccountId][chainId].total += 1;
    root[rootAccountId][chainId].accounts[shard.accountId] = true;
  }

  return root;
}

function getChainCounter(chains: Record<ChainId, Chain>) {
  const chainRoot = {
    checked: 0,
    total: 0,
  } as SelectedStruct[AccountId];

  for (const chain of Object.values(chains)) {
    const chainId = getConsensusChainId(chain);
    chainRoot[chainId] = {
      accounts: {},
      checked: 0,
      total: 0,
    };
  }

  return chainRoot;
}

function getStructForVault(
  rootAccountId: AccountId,
  rootAccountName: string,
  accounts: (VaultChainAccount | VaultShardAccount)[],
  chains: Record<ChainId, Chain>,
): RootStruct {
  const chainMap = new Map<ChainId | typeof EVM_GROUP_ID, (VaultChainAccount | VaultShardAccount)[]>();

  for (const account of accounts) {
    const chain = chains[account.chainId];
    const groupId = chain && getConsensusChainId(chain);

    const group = groupId && chainMap.get(groupId);
    if (group) {
      group.push(account);
    } else {
      chainMap.set(groupId, [account]);
    }
  }

  for (const accounts of chainMap.values()) {
    accounts.sort((a, b) => a.derivationPath.localeCompare(b.derivationPath));
  }

  const sortedChains = chainsService.sortChains(Object.values(chains));
  const chainOrder = new Map(sortedChains.map((chain, index) => [chain.chainId, index]));

  const chainTuples: ChainTuple[] = Array.from(chainMap.entries()).sort((a, b) => {
    if (a[0] === EVM_GROUP_ID) return 1;
    if (b[0] === EVM_GROUP_ID) return -1;

    const orderA = chainOrder.get(a[0]) ?? Infinity;
    const orderB = chainOrder.get(b[0]) ?? Infinity;
    return orderA - orderB;
  });

  return { rootAccountId, rootAccountName, chainTuples };
}

function getSelectedShards(struct: SelectedStruct, accounts: AnyAccount[]) {
  const selectedAccountIds = new Set<AccountId>();

  for (const rootData of Object.values(struct)) {
    const { total: _total, checked: _checked, ...chainGroups } = rootData;

    for (const chainData of Object.values(chainGroups)) {
      for (const [accountId, isSelected] of entries(chainData.accounts)) {
        if (isSelected) {
          selectedAccountIds.add(accountId);
        }
      }
    }
  }

  return accounts.filter((account) => selectedAccountIds.has(account.accountId));
}

export const shardsUtils = {
  getFilteredAccounts,
  getStructForVault,
  getVaultChainsCounter,
  getSelectedShards,
  EVM_GROUP_ID,
};
