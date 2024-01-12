import { Table } from 'dexie';

import type { Metadata } from '@entities/network';
import { MultisigEvent, MultisigTransaction, MultisigTransactionKey } from '@entities/transaction/model/transaction';
import type {
  Wallet,
  Account,
  Contact,
  AccountId,
  CallHash,
  ChainId,
  Balance,
  BalanceKey,
  ProxyAccount,
  Connection,
  Notification,
} from '@shared/core';
import { ProxyChainGroup } from '../../../core/types/proxy';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {
  connectTo: <T extends keyof DataStorage>(name: T) => DataStorage[T] | undefined;
}

export interface IBalanceStorage {
  getBalance: (accountId: AccountId, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getNetworkBalances: (accountIds: AccountId[], chainId: ChainId) => Promise<BalanceDS[]>;
  getAssetBalances: (accountIds: AccountId[], chainId: ChainId, assetId: string) => Promise<BalanceDS[]>;
  getBalances: (accountIds: AccountId[]) => Promise<BalanceDS[]>;
  getAllBalances: () => Promise<BalanceDS[]>;
  addBalance: (balance: Balance) => Promise<void>;
  updateBalance: (balance: Balance) => Promise<void>;
  insertBalances: (balances: Balance[]) => Promise<string[]>;
  setBalanceIsValid: (balanceKey: BalanceKey, verified: boolean) => Promise<number>;
  deleteBalances: (accountIds: AccountId[]) => Promise<number>;
}

export interface IMultisigEventStorage {
  getEvent: (eventId: ID) => Promise<MultisigEventDS | undefined>;
  getEvents: <T extends MultisigEvent>(where?: Partial<T>) => Promise<MultisigEventDS[]>;
  getEventsByKeys: (keys: MultisigTransactionKey[]) => Promise<MultisigEventDS[]>;
  addEvent: (event: MultisigEvent) => Promise<ID>;
  updateEvent: (event: MultisigEventDS) => Promise<ID>;
  deleteEvent: (eventId: ID) => Promise<void>;
}

export interface IMetadataStorage {
  getMetadata: (chainId: ChainId, version: number) => Promise<MetadataDS | undefined>;
  getAllMetadata: <T extends Metadata>(where?: Partial<T>) => Promise<MetadataDS[]>;
  addMetadata: (metadata: Metadata) => Promise<ID[]>;
  updateMetadata: (metadata: Metadata) => Promise<ID[]>;
  deleteMetadata: (chainId: ChainId, version: number) => Promise<void>;
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
  balances: IBalanceStorage;
  multisigTransactions: IMultisigTransactionStorage;
  multisigEvents: IMultisigEventStorage;
  metadata: IMetadataStorage;
};

export type ID = string;
type WithID<T extends Object> = { id?: ID } & T;

export type BalanceDS = WithID<Balance>;
export type MultisigTransactionDS = WithID<MultisigTransaction>;
export type MultisigEventDS = WithID<MultisigEvent>;
export type MetadataDS = WithID<Metadata>;

export type TWallet = Table<Wallet, Wallet['id']>;
export type TContact = Table<Contact, Contact['id']>;
export type TAccount = Table<Account, Account['id']>;
export type TBalance = Table<Balance, ID[]>;
export type TConnection = Table<Connection, Connection['id']>;
export type TProxy = Table<ProxyAccount, ProxyAccount['id']>;
export type TProxyGroup = Table<ProxyChainGroup, ProxyChainGroup['id']>;
export type TMultisigTransaction = Table<MultisigTransaction, ID[]>;
export type TMultisigEvent = Table<MultisigEvent, ID>;
export type TNotification = Table<Notification, Notification['id']>;
export type TMetadata = Table<Metadata, ID[]>;
