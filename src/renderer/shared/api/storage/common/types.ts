import { Table } from 'dexie';

import { Balance, BalanceKey } from '@renderer/entities/asset/model/balance';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { AccountId, Address, CallHash, ChainId } from '@renderer/domain/shared-kernel';
import { Wallet } from '@renderer/entities/wallet/model/wallet';
import { Account, MultisigAccount } from '@renderer/entities/account/model/account';
import { Notification } from '@renderer/entities/notification/model/notification';
import type { Contact } from '@renderer/entities/contact';
import {
  MultisigEvent,
  MultisigTransaction,
  MultisigTransactionKey,
} from '@renderer/entities/transaction/model/transaction';
import { Metadata } from '@renderer/entities/network';
import { LightClientState } from '@renderer/domain/lightClientState';

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
  setBalanceIsValid: (balanceKey: BalanceKey, verified: boolean) => Promise<number>;
}

export interface IConnectionStorage {
  getConnection: (chainId: ChainId) => Promise<ConnectionDS | undefined>;
  getConnections: () => Promise<ConnectionDS[]>;
  addConnection: (connection: Connection) => Promise<ID | ID[]>;
  addConnections: (connections: Connection[]) => Promise<ID>;
  updateConnection: (connection: Connection) => Promise<number>;
  changeConnectionType: (connection: Connection, type: ConnectionType) => Promise<number>;
  clearConnections: () => Promise<void>;
}

export interface IWalletStorage {
  getWallet: (walletId: ID) => Promise<WalletDS | undefined>;
  getWallets: <T extends Wallet>(where?: Partial<T>) => Promise<WalletDS[]>;
  addWallet: (wallet: Wallet) => Promise<ID>;
  updateWallet: (wallet: Wallet) => Promise<ID>;
  deleteWallet: (walletId: ID) => Promise<void>;
}

export interface IMultisigEventStorage {
  getEvent: (eventId: ID) => Promise<MultisigEventDS | undefined>;
  getEvents: <T extends MultisigEvent>(where?: Partial<T>) => Promise<MultisigEventDS[]>;
  getEventsByKeys: (keys: MultisigTransactionKey[]) => Promise<MultisigEventDS[]>;
  addEvent: (event: MultisigEvent) => Promise<ID>;
  updateEvent: (event: MultisigEventDS) => Promise<ID>;
  deleteEvent: (eventId: ID) => Promise<void>;
}

export interface IAccountStorage {
  getAccount: (accountId: ID) => Promise<AccountDS | undefined>;
  getAccounts: <T extends Account>(where?: Partial<T>) => Promise<AccountDS[]>;
  addAccount: <T extends Account>(account: T) => Promise<ID>;
  updateAccount: <T extends Account>(account: T) => Promise<ID>;
  updateAccounts: <T extends Account>(accounts: T[]) => Promise<ID>;
  deleteAccount: (accountId: Address) => Promise<void>;
}

export interface IContactStorage {
  getContact: (contactId: ID) => Promise<Contact | undefined>;
  getContacts: <T extends Contact>(where?: Partial<T>) => Promise<Contact[]>;
  addContact: (contact: Contact) => Promise<ID>;
  updateContact: (contact: Contact) => Promise<ID>;
  deleteContact: (contactId: ID) => Promise<void>;
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
}
export interface INotificationStorage {
  getNotifications: <T extends Notification>(where?: Partial<T>) => Promise<NotificationDS[]>;
  addNotification: (notification: Notification) => Promise<ID>;
}

export interface ILightClientStateStorage {
  getLightClientState: (chainId: ChainId) => Promise<lightClientStateDS | undefined>;
  addLightClientState: (lightClient: LightClientState) => Promise<void>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================

export type DataStorage = {
  balances: IBalanceStorage;
  connections: IConnectionStorage;
  wallets: IWalletStorage;
  accounts: IAccountStorage;
  contacts: IContactStorage;
  multisigTransactions: IMultisigTransactionStorage;
  multisigEvents: IMultisigEventStorage;
  notifications: INotificationStorage;
  metadata: IMetadataStorage;
  lightClientState: ILightClientStateStorage;
};

export type ID = string;
type WithID<T extends Object> = { id?: ID } & T;

export type WalletDS = WithID<Wallet>;
export type ContactDS = WithID<Contact>;
export type BalanceDS = WithID<Balance>;
export type ConnectionDS = WithID<Connection>;
export type AccountDS = WithID<Account | MultisigAccount>;
export type MultisigTransactionDS = WithID<MultisigTransaction>;
export type MultisigEventDS = WithID<MultisigEvent>;
export type NotificationDS = WithID<Notification>;
export type MetadataDS = WithID<Metadata>;
export type lightClientStateDS = WithID<LightClientState>;

export type TWallet = Table<Wallet, ID>;
export type TContact = Table<Contact, ID>;
export type TBalance = Table<Balance, ID[]>;
export type TConnection = Table<Connection, ID>;
export type TAccount = Table<Account | MultisigAccount, ID>;
export type TMultisigTransaction = Table<MultisigTransaction, ID[]>;
export type TMultisigEvent = Table<MultisigEvent, ID>;
export type TNotification = Table<Notification, ID>;
export type TMetadata = Table<Metadata, ID[]>;
export type TLightClientState = Table<LightClientState, ID>;
