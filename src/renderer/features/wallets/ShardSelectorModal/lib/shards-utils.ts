import { chainsService } from '@/shared/api/network';
import {
  type Chain,
  type ChainId,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
} from '@/shared/core';
import { entries, isStringsMatchQuery, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

import {
  type ChainTuple,
  type GroupId,
  type RootStruct,
  type SelectableAccount,
  type SelectedStruct,
  UNIVERSAL_GROUP_ID,
} from './types';

const EVM_GROUP_ID = 'evm' as const;

const getConsensusChainId = (chain: Chain): ChainId | typeof EVM_GROUP_ID => {
  return networkUtils.isEthereumBased(chain.options) ? EVM_GROUP_ID : (chain.parentId ?? chain.chainId);
};

/** The group a key belongs to: its relay family, EVM, or "no network scope". */
const getAccountGroupId = (account: SelectableAccount, chains: Record<ChainId, Chain>): GroupId | null => {
  if (!('chainId' in account)) return UNIVERSAL_GROUP_ID;

  const chain = chains[account.chainId];

  return chain ? getConsensusChainId(chain) : null;
};

function getFilteredAccounts(
  accounts: (VaultBaseAccount | VaultChainAccount | VaultShardAccount | VaultUniversalKeyAccount)[],
  chains: Record<ChainId, Chain>,
  query = '',
): SelectableAccount[] {
  return accounts.filter(accountUtils.isVaultDerivedAccount).filter((account) => {
    if (nullable(getAccountGroupId(account, chains))) return false;

    // An unscoped key has no home network, so its address is shown in the
    // generic Substrate format — search must match that same string.
    const prefix = 'chainId' in account ? chains[account.chainId]?.addressPrefix : undefined;
    const address = toAddress(account.accountId, { prefix });

    return isStringsMatchQuery(query, [account.derivationPath, address]);
  });
}

function getVaultChainsCounter(
  rootAccountId: AccountId,
  chains: Record<ChainId, Chain>,
  shards: SelectableAccount[],
): SelectedStruct {
  const root: SelectedStruct = {
    [rootAccountId]: getChainCounter(chains),
  };

  const rootEntry = root[rootAccountId];
  if (nullable(rootEntry)) return root;

  rootEntry.checked = shards.length;
  rootEntry.total = shards.length;

  for (const shard of shards) {
    const groupId = getAccountGroupId(shard, chains);
    if (nullable(groupId)) continue;

    const chainEntry = rootEntry[groupId];
    if (nullable(chainEntry)) continue;

    chainEntry.checked += 1;
    chainEntry.total += 1;
    chainEntry.accounts[shard.accountId] = true;
  }

  return root;
}

function getChainCounter(chains: Record<ChainId, Chain>) {
  const chainRoot = {
    checked: 0,
    total: 0,
  } as SelectedStruct[AccountId];

  const groupIds: GroupId[] = [UNIVERSAL_GROUP_ID, ...Object.values(chains).map(getConsensusChainId)];

  for (const groupId of groupIds) {
    chainRoot[groupId] = {
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
  accounts: SelectableAccount[],
  chains: Record<ChainId, Chain>,
): RootStruct {
  const chainMap = new Map<GroupId, SelectableAccount[]>();

  for (const account of accounts) {
    const groupId = getAccountGroupId(account, chains);

    if (nullable(groupId)) continue;

    const group = chainMap.get(groupId);
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

  // Keys that work on every network lead the list; EVM keys close it.
  const chainTuples: ChainTuple[] = Array.from(chainMap.entries()).sort((a, b) => {
    if (a[0] === UNIVERSAL_GROUP_ID) return -1;
    if (b[0] === UNIVERSAL_GROUP_ID) return 1;
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
  UNIVERSAL_GROUP_ID,
};
