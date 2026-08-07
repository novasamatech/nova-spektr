import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  AccountNameType,
  AccountType,
  CryptoType,
  KeyType,
  SigningType,
} from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

function createDraftAccount(
  draft: Pick<VaultShardAccount, 'chainId' | 'derivationPath'> & {
    groupId?: VaultShardAccount['groupId'];
  },
  chains: Record<ChainId, Chain>,
): DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount> {
  const chain = chains[draft.chainId];
  const isEthereumBased = chain ? networkUtils.isEthereumBased(chain.options) : false;
  const isSharded = nonNullable(draft.groupId);

  return {
    type: 'chain',
    name: draft.derivationPath,
    nameType: AccountNameType.GENERATED,
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

/**
 * Vault keys are network-agnostic: a derivation is a keypair, and the same
 * public key is valid on every network with a compatible crypto scheme (the
 * scheme itself is checked by `accountService.isAccountAvailableOnChain` before
 * this rule runs). The `chainId` carried by a derived key or a shard records
 * the network it was derived under in the key set — it is metadata for grouping
 * the keys, not a restriction on where the key may be used.
 *
 * Binding availability to that `chainId` used to hide a real key behind a
 * permission-less virtual placeholder on every other network, so the app
 * claimed the user held no key for their own multisig.
 */
function isAvailableOnChain(account: AnyAccount): boolean {
  return (
    accountUtils.isVaultBaseAccount(account) ||
    accountUtils.isVaultChainAccount(account) ||
    accountUtils.isVaultShardAccount(account)
  );
}

export const polkadotVaultService = {
  populateDraftAccounts,
  isAvailableOnChain,
};
