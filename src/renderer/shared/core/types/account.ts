import type { Signatory } from './signatory';
import type { AccountId, ChainId, Threshold, ID, NoID } from './general';
import { ChainType, CryptoType } from './general';
import { ProxyType, ProxyVariant } from './proxy';

type AbstractAccount = {
  id: ID;
  walletId: ID;
  name: string;
  type: AccountType;
};

export type BaseAccount = AbstractAccount & {
  accountId: AccountId;
  chainType: ChainType;
  cryptoType: CryptoType;
  signingExtras?: Record<string, any>;
};

export type ChainAccount = BaseAccount & {
  baseId?: ID;
  chainId: ChainId;
  keyType: KeyType;
  derivationPath: string;
};

export type ShardAccount = BaseAccount & {
  groupId: string;
  keyType: KeyType;
  chainId: ChainId;
  derivationPath: string;
};

export type MultisigAccount = BaseAccount & {
  signatories: Signatory[];
  threshold: Threshold;
  creatorAccountId: AccountId;
  matrixRoomId?: string;
  chainId?: ChainId;
};

export type WalletConnectAccount = Omit<BaseAccount, 'cryptoType'> & {
  chainId: ChainId;
};

export type ProxiedAccount = BaseAccount & {
  proxyAccountId: AccountId;
  chainId: ChainId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  extrinsicIndex?: number;
};

export type Account = BaseAccount | ChainAccount | MultisigAccount | WalletConnectAccount | ProxiedAccount;

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
