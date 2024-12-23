import { type BN } from '@polkadot/util';
import { type Table } from 'dexie';

import {
  type Account,
  type AccountId,
  type Balance,
  type BasketTransaction,
  type CallHash,
  type ChainId,
  type ChainMetadata,
  type Connection,
  type Contact,
  type FlexibleMultisigTransaction,
  type MultisigEvent,
  type MultisigTransaction,
  type MultisigTransactionKey,
  type Notification,
  type ProxyAccount,
  type ProxyGroup,
  type Wallet,
} from '@/shared/core';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {
  connectTo: <T extends keyof DataStorage>(name: T) => DataStorage[T] | undefined;
}

export interface IMultisigEventStorage {
  getEvent: (eventId: ID) => Promise<MultisigEventDS | undefined>;
  getEvents: <T extends MultisigEvent>(where?: Partial<T>) => Promise<MultisigEventDS[]>;
  getEventsByKeys: (keys: MultisigTransactionKey[]) => Promise<MultisigEventDS[]>;
  addEvent: (event: MultisigEvent) => Promise<ID>;
  updateEvent: (event: MultisigEventDS) => Promise<ID>;
  deleteEvent: (eventId: ID) => Promise<void>;
}

export interface IMultisigTransactionStorage {
  getMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (accountIds: AccountId[]) => Promise<MultisigTransactionDS[]>;
  addMultisigTx: (tx: MultisigTransaction) => Promise<void>;
  updateMultisigTx: (tx: MultisigTransactionDS) => Promise<number>;
  deleteMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ) => Promise<void>;
  deleteMultisigTxs: (accountId: AccountId) => Promise<number>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================

export type DataStorage = {
  multisigTransactions: IMultisigTransactionStorage;
  multisigEvents: IMultisigEventStorage;
};

export type ID = string;
type WithID<T extends NonNullable<unknown>> = { id?: ID } & T;

export type MultisigTransactionDS = WithID<MultisigTransaction>;
export type FlexibleMultisigTransactionDS = WithID<FlexibleMultisigTransaction>;
export type MultisigEventDS = WithID<MultisigEvent>;

export type TWallet = Table<Omit<Wallet, 'accounts'>, Wallet['id']>;
export type TContact = Table<Contact, Contact['id']>;
export type TAccount = Table<Account, Account['id']>;
export type TBalance = Table<BnToString<Balance>, Balance['id']>;
export type TConnection = Table<Connection, Connection['id']>;
export type TProxy = Table<ProxyAccount, ProxyAccount['id']>;
export type TProxyGroup = Table<ProxyGroup, ProxyGroup['id']>;
export type TMultisigTransaction = Table<MultisigTransaction, ID[]>;
export type TMultisigEvent = Table<MultisigEvent, ID>;
export type TNotification = Table<Notification, Notification['id']>;
export type TMetadata = Table<ChainMetadata, ChainMetadata['id']>;
export type TBasketTransaction = Table<BasketTransaction, BasketTransaction['id']>;

// =====================================================
// ===================== Utility =======================
// =====================================================

/**
 * Convert any BN | undefined to string | undefined
 */
export type BnToString<T> = {
  [K in keyof T]: T[K] extends BN | undefined
    ? string
    : T[K] extends (infer U)[] | undefined
      ? BnToString<U>[] | undefined
      : T[K] extends object
        ? BnToString<T[K]>
        : T[K];
};
