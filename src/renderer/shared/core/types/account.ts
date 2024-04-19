import type { Signatory } from './signatory';
import type { AccountId, ChainId, Threshold, ID } from './general';
import { ChainType, CryptoType } from './general';
import { ProxyType, ProxyVariant } from './proxy';

export type Account_NEW = {
  id: ID;
  walletId: ID;
  name: string;
  type: AccountType;
  accountId: AccountId;
  chainId: ChainId;
  chainType: ChainType;
  cryptoType?: CryptoType;
  signingExtras?: Record<string, any>;
};

export type ChainAccount = Account_NEW & {
  baseId?: ID;
  keyType: KeyType;
  derivationPath: string;
  // cryptoType: CryptoType;
};

export type ShardAccount = Account_NEW & {
  groupId: string;
  keyType: KeyType;
  derivationPath: string;
  // cryptoType: CryptoType;
};

export type MultisigAccount = Account_NEW & {
  signatories: Signatory[];
  threshold: Threshold;
  creatorAccountId: AccountId;
  matrixRoomId?: string;
  chainId?: ChainId;
  // cryptoType: CryptoType;
};

export type WcAccount = Account_NEW;

export type ProxiedAccount = Account_NEW & {
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  // cryptoType: CryptoType;
  extrinsicIndex?: number;
};

// export type Account_NEW = BaseAccount | ChainAccount | MultisigAccount | WalletConnectAccount | ProxiedAccount;

// export type DraftAccount<T extends Account> = Omit<NoID<T>, 'accountId' | 'walletId' | 'baseId'>;

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
