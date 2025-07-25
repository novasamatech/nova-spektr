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
  keyType: KeyType;
  derivationPath: string;
  publicKey?: string;
}

export interface VaultShardAccount extends ChainAccount {
  accountType: AccountType.SHARD;
  groupId: string;
  keyType: KeyType;
  derivationPath: string;
  publicKey?: string;
}

export interface MultisigAccount extends UniversalAccount {
  accountType: AccountType.MULTISIG;
  signatories: Signatory[];
  threshold: number;
}

export interface MultisigSignatoryAccount extends UniversalAccount {
  accountType: AccountType.MULTISIG_SIGNATORY;
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
  connections: ProxiedConnection[];
}

export interface ProxiedConnection {
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

export type DraftAccount<T extends Account> = Omit<NoID<T>, 'accountId' | 'walletId'>;

export const enum AccountType {
  WATCH_ONLY = 'watch_only',
  BASE = 'base',
  CHAIN = 'chain',
  SHARD = 'shard',
  MULTISIG = 'multisig',
  FLEXIBLE_MULTISIG = 'flexible_multisig',
  WALLET_CONNECT = 'wallet_connect',
  PROXIED = 'proxied',
  MULTISIG_SIGNATORY = 'multisig_signatory',
}

export const enum KeyType {
  MAIN = 'main',
  PUBLIC = 'pub',
  HOT = 'hot',
  CUSTOM = 'custom',
}
