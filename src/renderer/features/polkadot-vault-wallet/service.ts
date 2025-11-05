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

function createDraftAccount(
  draft: Pick<VaultShardAccount, 'chainId' | 'derivationPath'> & {
    groupId?: VaultShardAccount['groupId'];
  },
  chains: Record<ChainId, Chain>,
): DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount> {
  const isEthereumBased = networkUtils.isEthereumBased(chains[draft.chainId].options);
  const isSharded = nonNullable(draft.groupId);

  return {
    type: 'chain',
    name: draft.derivationPath,
    keyType: KeyType.CUSTOM,
    chainId: draft.chainId,
    accountType: isSharded ? AccountType.SHARD : AccountType.CHAIN,
    cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    derivationPath: draft.derivationPath,
    ...(isSharded && { groupId: draft.groupId }),
  } as DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>;
}

function populateDraftAccounts(
  draftAccounts: Pick<VaultChainAccount, 'chainId' | 'derivationPath'>[],
  chains: Record<ChainId, Chain>,
) {
  return draftAccounts.map(draft => {
    return createDraftAccount(draft, chains);
  });
}

export const polkadotVaultService = {
  populateDraftAccounts,
};
