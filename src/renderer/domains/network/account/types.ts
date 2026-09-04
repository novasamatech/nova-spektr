import { type AccountNameType, type ChainId, type CryptoType, type ID, type SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * @summary
 * Account that can be used as root for accounts on different chains. Account
 * for specific chain can be calculated in runtime or predefined somewhere in
 * database. Because of "one to many" relations this kind of accounts need some
 * additional checks before performing business logic (e.g. chains
 * restrictions).
 */
export interface UniversalAccount {
  id: string;
  type: 'universal';
  name: string;
  nameType?: AccountNameType;
  walletId: ID;
  accountId: AccountId;
  cryptoType: CryptoType;
  signingType: SigningType;
  createdAt: number;
}

/**
 * @summary
 * Account related to specific chain. This is the most common case and such accounts
 * have "one to one" relations with other entities in the system.
 */
export interface ChainAccount {
  id: string;
  type: 'chain';
  name: string;
  nameType?: AccountNameType;
  walletId: ID;
  chainId: ChainId;
  accountId: AccountId;
  cryptoType: CryptoType;
  signingType: SigningType;
  createdAt: number;
}

export type AnyAccount = UniversalAccount | ChainAccount;

/**
 * Utility type for working with partial account data
 */
export type AnyAccountDraft<T extends UniversalAccount | ChainAccount = UniversalAccount | ChainAccount> =
  T extends UniversalAccount ? Omit<T, 'id'> : Omit<T, 'id'>;

// Accounts graph

export type AccountNode = {
  account: AnyAccount;
  children: AccountNode[];
};

export type AccountValidationError = { account: AnyAccount; message: string };

/**
 * How a wallet's name takes part in resolving one of its accounts' names.
 * `override`: the wallet name is the label, beating everything. `fallback`: the
 * account resolves on its own and the wallet name only fills in before the
 * stored account name / short address. Shared by the display side
 * (`<NamedAccount walletNameAs>`) and the search side so they cannot drift.
 */
export type WalletNameMode = 'override' | 'fallback';

/**
 * Why nothing local can sign for a key on a chain.
 *
 * - `no-local-account` — a contact, or a key held only by a hidden wallet.
 * - `chain-unsupported` — the wallet holds the key but cannot act on this chain,
 *   e.g. a WalletConnect session paired without it.
 * - `watch-only` — the key is imported for watching only; it never signs.
 * - `no-signer` — the account is on this chain, but nothing signs for it, e.g. a
 *   proxied account whose delegate is not local.
 */
export type SigningBlockReason = 'no-local-account' | 'chain-unsupported' | 'watch-only' | 'no-signer';

export type SigningAccountResolution = {
  /** The account to sign with; `null` when `reason` says why that is impossible. */
  account: AnyAccount | null;
  reason: SigningBlockReason | null;
};
