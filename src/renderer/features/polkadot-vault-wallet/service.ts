import { groupBy, pickBy } from 'lodash';

import {
  AccountType,
  type Chain,
  type ChainId,
  CryptoType,
  type DraftAccount,
  KeyType,
  SigningType,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

const SHARDED_PATH_REGEX = /^(.*\/)(\d+)$/;

function getShardedDerivationBasePath(derivationPath: string) {
  const match = derivationPath.match(SHARDED_PATH_REGEX);
  return match ? match[1] : null;
}

function groupShardedDerivations<T extends { derivationPath: string }>(keys: T[]) {
  const grouped = groupBy(keys, key => getShardedDerivationBasePath(key.derivationPath));
  delete grouped.null;
  return pickBy(grouped, items => items.length > 1);
}

function buildDerivationToGroupIdMap(
  draftAccounts: Pick<VaultChainAccount, 'chainId' | 'derivationPath'>[],
  existingAccounts: (VaultChainAccount | VaultShardAccount)[],
): Map<string, string> {
  const draftGroups = groupShardedDerivations(draftAccounts);
  const existingShardAccounts = existingAccounts.filter(a => accountUtils.isVaultShardAccount(a));
  const existingGroups = groupShardedDerivations(existingShardAccounts);

  const derivationToGroupId = new Map<string, string>();

  for (const [basePath, drafts] of Object.entries(draftGroups)) {
    const existingGroupId = existingGroups[basePath]?.[0]?.groupId;
    const groupId = existingGroupId ?? crypto.randomUUID();

    for (const draft of drafts) {
      derivationToGroupId.set(draft.derivationPath, groupId);
    }
  }

  for (const draft of draftAccounts) {
    if (derivationToGroupId.has(draft.derivationPath)) continue;

    const basePath = getShardedDerivationBasePath(draft.derivationPath);
    if (!basePath) continue;

    const existingGroupId = existingGroups[basePath]?.[0]?.groupId;
    if (existingGroupId) {
      derivationToGroupId.set(draft.derivationPath, existingGroupId);
    }
  }

  return derivationToGroupId;
}

function createDraftAccount(
  draft: Pick<VaultChainAccount, 'chainId' | 'derivationPath'>,
  chains: Record<ChainId, Chain>,
  groupId: string | undefined,
): DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount> {
  const isEthereumBased = networkUtils.isEthereumBased(chains[draft.chainId].options);
  const isSharded = nonNullable(groupId);

  return {
    type: 'chain',
    name: draft.derivationPath,
    keyType: KeyType.CUSTOM,
    chainId: draft.chainId,
    accountType: isSharded ? AccountType.SHARD : AccountType.CHAIN,
    cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    derivationPath: draft.derivationPath,
    ...(isSharded && { groupId }),
  } as DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>;
}

function populateDraftAccounts(
  draftAccounts: Pick<VaultChainAccount, 'chainId' | 'derivationPath'>[],
  chains: Record<ChainId, Chain>,
  existingAccounts: (VaultChainAccount | VaultShardAccount)[] = [],
) {
  const derivationToGroupId = buildDerivationToGroupIdMap(draftAccounts, existingAccounts);

  return draftAccounts.map(draft => {
    const groupId = derivationToGroupId.get(draft.derivationPath);
    return createDraftAccount(draft, chains, groupId);
  });
}

export const polkadotVaultService = {
  populateDraftAccounts,
};
