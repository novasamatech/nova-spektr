import { type Asset } from '@/shared/core';

import {
  type AccountId,
  type ChainId,
  type ChainType,
  type CryptoType,
  type ID,
  type MultisigThreshold,
  type NoID,
} from './general';
import { type ProxyType, type ProxyVariant } from './proxy';
import { type Signatory } from './signatory';

type GenericAccount = {
  id: ID;
  walletId: ID;
  name: string;
  accountId: AccountId;
  chainType: ChainType;
  signingExtras?: Record<string, any>;
};

export type BaseAccount = GenericAccount & {
  type: AccountType.BASE;
  cryptoType: CryptoType;
};

export type ChainAccount = GenericAccount & {
  type: AccountType.CHAIN;
  baseId?: ID;
  keyType: KeyType;
  derivationPath: string;
  chainId: ChainId;
  cryptoType: CryptoType;
};

export type ShardAccount = GenericAccount & {
  type: AccountType.SHARD;
  groupId: string;
  keyType: KeyType;
  derivationPath: string;
  chainId: ChainId;
  cryptoType: CryptoType;
};

export type MultisigAccount = GenericAccount & {
  type: AccountType.MULTISIG;
  signatories: Signatory[];
  threshold: MultisigThreshold;
  chainId?: ChainId;
  cryptoType: CryptoType;
  creatorAccountId: AccountId;
};

export type A = Asset;

export type WcAccount = GenericAccount & {
  type: AccountType.WALLET_CONNECT;
  chainId: ChainId;
};

export type ProxiedAccount = GenericAccount & {
  type: AccountType.PROXIED;
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  extrinsicIndex?: number;
  chainId: ChainId;
  cryptoType: CryptoType;
};

export type Account = BaseAccount | ChainAccount | ShardAccount | MultisigAccount | WcAccount | ProxiedAccount;

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
