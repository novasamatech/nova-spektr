import { type AccountId } from '@/shared/polkadotjs-schemas';
// TODO we should move each account type into separated feature that implements logic around it.
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type ChainAccount, type UniversalAccount } from '@/domains/network';

import { type NoID } from './general';
import { type ProxyType, type ProxyVariant } from './proxy';
import { type Signatory } from './signatory';

export interface WatchOnlyAccount extends UniversalAccount {
  accountType: AccountType.WATCH_ONLY;
}

export interface VaultBaseAccount extends UniversalAccount {
  accountType: AccountType.BASE;
}

export interface VaultChainAccount extends ChainAccount {
  accountType: AccountType.CHAIN;
  baseAccountId?: AccountId;
  keyType: KeyType;
  derivationPath: string;
}

export interface VaultShardAccount extends ChainAccount {
  accountType: AccountType.SHARD;
  groupId: string;
  keyType: KeyType;
  derivationPath: string;
}

export interface MultisigAccount extends ChainAccount {
  accountType: AccountType.MULTISIG;
  signatories: Signatory[];
  threshold: number;
}

export interface FlexibleMultisigAccount extends ChainAccount {
  accountType: AccountType.FLEXIBLE_MULTISIG;
  signatories: Signatory[];
  threshold: number;
  proxyAccountId?: AccountId; // we have accountId only after proxy is created
}

export interface WcAccount extends ChainAccount {
  accountType: AccountType.WALLET_CONNECT;
  signingExtras: {
    pairingTopic?: string;
    sessionTopic?: string;
  };
}

export interface ProxiedAccount extends ChainAccount {
  accountType: AccountType.PROXIED;
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  extrinsicIndex?: number;
}

/**
 * @deprecated Use `import { type AnyAccount } from '@/domains/network'`
 *   instead.
 */
export type Account = AnyAccount;

export type DraftAccount<T extends Account> = Omit<NoID<T>, 'accountId' | 'walletId' | 'baseAccountId'>;

export const enum AccountType {
  WATCH_ONLY = 'watch_only',
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
