import {
  type Chain,
  type ChainId,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { entries, isStringsMatchQuery, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
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
  const chainTuples: ChainTuple[] = [];

  for (const account of accounts) {
    const chain = chains[account.chainId];
    const groupId = getConsensusChainId(chain);
    const group = chainTuples.find(([id]) => id === groupId);
    if (group) {
      group[1].push(account);
    } else {
      chainTuples.push([groupId, [account]]);
    }
  }

  return { rootAccountId, rootAccountName, chainTuples };
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

export const shardsUtils = {
  getFilteredAccounts,
  getStructForVault,
  getVaultChainsCounter,
  getSelectedShards,
  EVM_GROUP_ID,
};
