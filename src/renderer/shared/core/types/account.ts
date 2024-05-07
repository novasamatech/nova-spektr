import type { AccountId, ChainId, ID, NoID, Threshold } from './general';
import { ChainType, CryptoType } from './general';
import { Signatory } from './signatory';
import { ProxyType, ProxyVariant } from './proxy';

export interface Account {
  id: ID;
  walletId: ID;
  name: string;
  type: AccountType;
  accountId: AccountId;
  chainType: ChainType;
  signingExtras?: Record<string, any>;
}

export interface BaseAccount extends Account {
  type: AccountType.BASE;
  cryptoType: CryptoType;
}

export interface ChainAccount extends Account {
  baseId?: ID;
  keyType: KeyType;
  derivationPath: string;
  chainId: ChainId;
  cryptoType: CryptoType;
  type: AccountType.CHAIN;
}

export interface ShardAccount extends Account {
  groupId: string;
  keyType: KeyType;
  derivationPath: string;
  chainId: ChainId;
  cryptoType: CryptoType;
  type: AccountType.SHARD;
}

export interface MultisigAccount extends Account {
  signatories: Signatory[];
  threshold: Threshold;
  creatorAccountId: AccountId;
  chainId?: ChainId;
  cryptoType: CryptoType;
  type: AccountType.MULTISIG;
}

export interface WcAccount extends Account {
  chainId: ChainId;
  type: AccountType.WALLET_CONNECT;
}

export interface ProxiedAccount extends Account {
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  extrinsicIndex?: number;
  chainId: ChainId;
  cryptoType: CryptoType;
  type: AccountType.PROXIED;
}

export type DraftAccount<T extends Account> = Omit<NoID<T>, 'accountId' | 'walletId' | 'baseId'>;

export const enum AccountType {
  BASE = 'base',
  CHAIN = 'chain',
  SHARD = 'shard',
  MULTISIG = 'multisig',
  WALLET_CONNECT = 'wallet_connect',
  PROXIED = 'proxied',
}

export const enum KeyType {
  MAIN = 'main',
  PUBLIC = 'pub',
  HOT = 'hot',
  GOVERNANCE = 'governance',
  STAKING = 'staking',
  CUSTOM = 'custom',
}
