import { type AccountId } from '@/shared/polkadotjs-schemas';
// TODO we should move each account type into separated feature that implements logic around it.
// eslint-disable-next-line boundaries/element-types
import { type ChainAccount as CAccount, type UniversalAccount } from '@/domains/network';

import { type ID, type NoID } from './general';
import { type ProxyType, type ProxyVariant } from './proxy';
import { type Signatory } from './signatory';

export type BaseAccount = UniversalAccount<{
  id: ID;
  accountType: AccountType.BASE;
}>;

export type ChainAccount = CAccount<{
  id: ID;
  accountType: AccountType.CHAIN;
  baseAccountId?: AccountId;
  keyType: KeyType;
  derivationPath: string;
}>;

export type ShardAccount = CAccount<{
  id: ID;
  accountType: AccountType.SHARD;
  groupId: string;
  keyType: KeyType;
  derivationPath: string;
}>;

export type MultisigAccount = CAccount<{
  id: ID;
  accountType: AccountType.MULTISIG;
  signatories: Signatory[];
  threshold: number;
}>;

export type FlexibleMultisigAccount = CAccount<{
  id: ID;
  accountType: AccountType.FLEXIBLE_MULTISIG;
  signatories: Signatory[];
  threshold: number;
  proxyAccountId?: AccountId; // we have accountId only after proxy is created
}>;

export type WcAccount = CAccount<{
  id: ID;
  accountType: AccountType.WALLET_CONNECT;
  signingExtras: Record<string, any>;
}>;

export type ProxiedAccount = CAccount<{
  id: ID;
  accountType: AccountType.PROXIED;
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  extrinsicIndex?: number;
}>;

export type Account =
  | BaseAccount
  | ChainAccount
  | ShardAccount
  | MultisigAccount
  | WcAccount
  | ProxiedAccount
  | FlexibleMultisigAccount;

export type DraftAccount<T extends Account> = Omit<NoID<T>, 'accountId' | 'walletId' | 'baseId'>;

export const enum AccountType {
  BASE = 'base',
  CHAIN = 'chain',
  SHARD = 'shard',
  MULTISIG = 'multisig',
  FLEXIBLE_MULTISIG = 'flexible_multisig',
  WALLET_CONNECT = 'wallet_connect',
  PROXIED = 'proxied',
}

export const enum KeyType {
  MAIN = 'main',
  PUBLIC = 'pub',
  HOT = 'hot',
  CUSTOM = 'custom',
}
