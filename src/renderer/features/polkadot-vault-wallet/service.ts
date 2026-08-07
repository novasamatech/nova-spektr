import {
  type Chain,
  type ChainId,
  type DraftAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
  AccountNameType,
  AccountType,
  CryptoType,
  KeyType,
  SigningType,
} from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

/**
 * A key the user has described but not yet derived on the device. `chainId` is
 * `null` when the key is not scoped to a network ("All networks") — the default
 * for newly added keys.
 */
export type DerivationKeyDraft = {
  chainId: ChainId | null;
  derivationPath: string;
  groupId?: VaultShardAccount['groupId'];
};

export type VaultDraftAccount =
  | DraftAccount<VaultChainAccount>
  | DraftAccount<VaultShardAccount>
  | DraftAccount<VaultUniversalKeyAccount>;

/** A draft that came back from the device with its derived public key filled in. */
export type VaultScannedAccount = VaultDraftAccount & { accountId: AccountId };

function createDraftAccount(draft: DerivationKeyDraft, chains: Record<ChainId, Chain>): VaultDraftAccount {
  const isSharded = nonNullable(draft.groupId);
  const common = {
    name: draft.derivationPath,
    nameType: AccountNameType.GENERATED,
    keyType: KeyType.CUSTOM,
    signingType: SigningType.POLKADOT_VAULT,
    derivationPath: draft.derivationPath,
  };

  // No chain means the user left the key on "All networks". Such a key has no
  // home network to take the crypto scheme from, and an Ethereum derivation is
  // inherently network-scoped, so it is always Substrate.
  if (nullable(draft.chainId)) {
    return {
      ...common,
      type: 'universal',
      accountType: AccountType.UNIVERSAL_KEY,
      cryptoType: CryptoType.SR25519,
    } as DraftAccount<VaultUniversalKeyAccount>;
  }

  const chain = chains[draft.chainId];
  const isEthereumBased = chain ? networkUtils.isEthereumBased(chain.options) : false;

  return {
    ...common,
    type: 'chain',
    chainId: draft.chainId,
    accountType: isSharded ? AccountType.SHARD : AccountType.CHAIN,
    cryptoType: isEthereumBased ? CryptoType.ETHEREUM : CryptoType.SR25519,
    ...(isSharded && { groupId: draft.groupId }),
  } as DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>;
}

function populateDraftAccounts(draftAccounts: DerivationKeyDraft[], chains: Record<ChainId, Chain>) {
  return draftAccounts.map(draft => {
    return createDraftAccount(draft, chains);
  });
}

/**
 * Vault keys are network-agnostic: a derivation is a keypair, and the same
 * public key is valid on every network with a compatible crypto scheme (the
 * scheme itself is checked by `accountService.isAccountAvailableOnChain` before
 * this rule runs). A `chainId` on a key or a shard records the network it was
 * scoped to in the key set — it is metadata for grouping and naming the keys,
 * not a restriction on where the key may be used.
 *
 * Binding availability to that `chainId` used to hide a real key behind a
 * permission-less virtual placeholder on every other network, so the app
 * claimed the user held no key for their own multisig.
 */
function isAvailableOnChain(account: AnyAccount): boolean {
  return isVaultAccount(account);
}

/** Any account belonging to a Polkadot Vault wallet — root key or derivation. */
function isVaultAccount(account: AnyAccount): boolean {
  return accountUtils.isVaultBaseAccount(account) || accountUtils.isVaultDerivedAccount(account);
}

export const polkadotVaultService = {
  populateDraftAccounts,
  createDraftAccount,
  isAvailableOnChain,
  isVaultAccount,
};
