import { Table } from 'dexie';

import { Balance } from '@renderer/domain/balance';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { Contact } from '@renderer/domain/contact';
import { Address, ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { Wallet } from '@renderer/domain/wallet';
import { MultisigTransaction } from '@renderer/domain/transaction';
import { Account, MultisigAccount } from '@renderer/domain/account';

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
  updateBalance: (balance: Balance) => Promise<void>;
  setBalanceIsValid: (balance: Balance, verified: boolean) => Promise<number>;
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
  deleteWallet: (walletId: string) => Promise<void>;
}

export interface IAccountStorage {
  getAccount: (accountId: ID) => Promise<AccountDS | undefined>;
  getAccounts: <T extends Account>(where?: Partial<T>) => Promise<AccountDS[]>;
  addAccount: <T extends Account>(account: T) => Promise<ID>;
  updateAccount: <T extends Account>(account: T) => Promise<ID>;
  deleteAccount: (accountId: Address) => Promise<void>;
}

export interface IContactStorage {
  getContact: (contactId: ID) => Promise<Contact | undefined>;
  getContacts: <T extends Contact>(where?: Partial<T>) => Promise<Contact[]>;
  addContact: (contact: Contact) => Promise<ID>;
  updateContact: (contact: Contact) => Promise<ID>;
  deleteContact: (contactId: ID) => Promise<void>;
}

export interface IMultisigTransactionStorage {
  getMultisigTx: (txId: ID) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (accountIds: AccountId[]) => Promise<MultisigTransactionDS[]>;
  addMultisigTx: (tx: MultisigTransaction) => Promise<ID>;
  updateMultisigTx: (tx: MultisigTransactionDS) => Promise<ID>;
  deleteMultisigTx: (txId: ID) => Promise<void>;
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
};

export type ID = string;
type WithID<T extends Object> = { id?: ID } & T;

export type WalletDS = WithID<Wallet>;
export type ContactDS = WithID<Contact>;
export type BalanceDS = WithID<Balance>;
export type ConnectionDS = WithID<Connection>;
export type AccountDS = WithID<Account | MultisigAccount>;
export type MultisigTransactionDS = WithID<MultisigTransaction>;

export type TWallet = Table<Wallet, ID>;
export type TContact = Table<Contact, ID>;
export type TBalance = Table<Balance, ID[]>;
export type TConnection = Table<Connection, ID>;
export type TAccount = Table<Account | MultisigAccount, ID>;
export type TMultisigTransaction = Table<MultisigTransaction, ID>;
