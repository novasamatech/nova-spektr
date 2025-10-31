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
import { groupShardedDerivations, nonNullable } from '@/shared/lib/utils';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

function populateDraftAccounts(
  draftAccounts: Pick<VaultChainAccount, 'chainId' | 'derivationPath'>[],
  chains: Record<ChainId, Chain>,
  existingAccounts: (VaultChainAccount | VaultShardAccount)[] = [],
) {
  const draftAccountGroups = groupShardedDerivations(draftAccounts);
  const existingAccountGroups = groupShardedDerivations(
    existingAccounts.filter(a => accountUtils.isVaultShardAccount(a)),
  );

  const derivationToGroupId = new Map<string, string>();
  for (const [basePath, drafts] of Object.entries(draftAccountGroups)) {
    const existingGroupId = existingAccountGroups[basePath]?.at(0)?.groupId;
    const groupId = existingGroupId ?? crypto.randomUUID();
    for (const draft of drafts) {
      derivationToGroupId.set(draft.derivationPath, groupId);
    }
  }

  return draftAccounts.map(draft => {
    const isEthereumBased = networkUtils.isEthereumBased(chains[draft.chainId].options);
    const groupId = derivationToGroupId.get(draft.derivationPath);
    const isSharded = nonNullable(groupId);

    const account = {
      type: 'chain',
      name: draft.derivationPath,
      keyType: KeyType.CUSTOM,
      chainId: draft.chainId,
      accountType: isSharded ? AccountType.SHARD : AccountType.CHAIN,
      cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      derivationPath: draft.derivationPath,
      ...(isSharded && { groupId }),
    };
    return account as DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>;
  });
}

export const polkadotVaultService = {
  populateDraftAccounts,
};
