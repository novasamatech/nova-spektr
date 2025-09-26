import { type AccountId } from '@/shared/polkadotjs-schemas';
// TODO we should move each account type into separated feature that implements logic around it.
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type ChainAccount, type UniversalAccount } from '@/domains/network';

import { type ChainId, type NoID } from './general';
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

  // Temp fields for freshly created user accounts , used for sync comparison with indexer metadata
  blockNumber?: number; // Block number when this account was created
  remarkChainId?: ChainId; // Chain ID where the remark was submitted
}

/**
 * Special account type for flexible multisig. It contains 2 accounts from
 * chain, proxied account that works as facade and proxy account that is actual
 * multisig account.
 */
export interface FlexibleMultisigAccount extends ChainAccount {
  accountType: AccountType.FLEX_MULTISIG;
  // multisig account part
  multisigAccountId: AccountId;
  signatories: Signatory[];
  threshold: number;

  // proxied account part
  deposit: string;
  blockNumber: number;
  extrinsicIndex: number;
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
  proxyVariant: ProxyVariant;
  deposit: string;
  blockNumber: number;
  extrinsicIndex: number;
}

export interface ProxiedConnection {
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
}

export type DraftAccount<T extends AnyAccount> = Omit<NoID<T>, 'accountId' | 'walletId'>;

export const enum AccountType {
  WATCH_ONLY = 'watch_only',
  BASE = 'base',
  CHAIN = 'chain',
  SHARD = 'shard',
  MULTISIG = 'multisig',
  WALLET_CONNECT = 'wallet_connect',
  PROXIED = 'proxied',
  MULTISIG_SIGNATORY = 'multisig_signatory',
  FLEX_MULTISIG = 'flex_multisig',
}

export const enum KeyType {
  MAIN = 'main',
  PUBLIC = 'pub',
  HOT = 'hot',
  CUSTOM = 'custom',
}
