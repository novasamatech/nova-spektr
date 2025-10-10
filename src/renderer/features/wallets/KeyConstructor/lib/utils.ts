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
import { type DerivationKeyDraft } from '../model/constructor-model';

export function populateDraftAccounts(draftKeys: DerivationKeyDraft[], chains: Record<ChainId, Chain>) {
  const shardedKeyGroups = groupShardedDerivations(draftKeys);

  const derivationToGroupId = new Map<string, string>();
  for (const [_, keys] of Object.entries(shardedKeyGroups)) {
    const groupId = crypto.randomUUID();
    for (const key of keys) {
      derivationToGroupId.set(key.derivationPath, groupId);
    }
  }

  return draftKeys.map((key) => {
    const isEthereumBased = networkUtils.isEthereumBased(chains[key.chainId].options);
    const groupId = derivationToGroupId.get(key.derivationPath);
    const isSharded = nonNullable(groupId);

    const account = {
      type: 'chain',
      name: key.derivationPath,
      keyType: KeyType.CUSTOM,
      chainId: key.chainId,
      accountType: isSharded ? AccountType.SHARD : AccountType.CHAIN,
      cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      derivationPath: key.derivationPath,
      ...(isSharded && { groupId }),
    };
    return account as DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>;
  });
}
