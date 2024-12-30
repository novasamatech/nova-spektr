import { type ChainId, type CryptoType, type ID, type SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * @summary
 * Account that can be used as root for accounts on different chains. Account
 * for specific chain can be calculated in runtime or predefined somewhere in
 * database. Because of "one to many" relations this kind of accounts need some
 * additional checks before performing business logic (e.g. chains
 * restrictions).
 */
export type UniversalAccount<Additional extends NonNullable<unknown> = Record<string, unknown>> = Additional & {
  id: string;
  type: 'universal';
  name: string;
  walletId: ID;
  accountId: AccountId;
  cryptoType: CryptoType;
  signingType: SigningType;
};

/**
 * @summary
 * Account related to specific chain. This is most common case and such accounts
 * have "one to one" relations with other entities in the system.
 */
export type ChainAccount<Additional extends NonNullable<unknown> = Record<string, unknown>> = Additional & {
  id: string;
  type: 'chain';
  name: string;
  walletId: ID;
  chainId: ChainId;
  accountId: AccountId;
  cryptoType: CryptoType;
  signingType: SigningType;
};

export type AnyAccount = (UniversalAccount | ChainAccount) & Record<string, any>;

/**
 * Utility type for working with partial account data
 */
export type AnyAccountDraft = (
  | Pick<ChainAccount, 'type' | 'accountId' | 'walletId' | 'chainId'>
  | Pick<UniversalAccount, 'type' | 'accountId' | 'walletId'>
) &
  Record<string, unknown>;
