import { IndexableType } from 'dexie';

import { Balance } from '@renderer/domain/balance';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { Contact } from '@renderer/domain/contact';
import { AccountID, ChainId, PublicKey } from '@renderer/domain/shared-kernel';
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
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getNetworkBalances: (publicKeys: PublicKey[], chainId: ChainId) => Promise<BalanceDS[]>;
  getAssetBalances: (publicKeys: PublicKey[], chainId: ChainId, assetId: string) => Promise<BalanceDS[]>;
  getBalances: (publicKeys: PublicKey[]) => Promise<BalanceDS[]>;
  getAllBalances: () => Promise<BalanceDS[]>;
  updateBalance: (balance: Balance) => Promise<void>;
  setBalanceIsValid: (balance: Balance, verified: boolean) => Promise<number>;
}

export interface IConnectionStorage {
  getConnection: (chainId: ChainId) => Promise<ConnectionDS | undefined>;
  getConnections: () => Promise<ConnectionDS[]>;
  addConnection: (connection: Connection) => Promise<IndexableType>;
  addConnections: (connections: Connection[]) => Promise<IndexableType>;
  updateConnection: (connection: Connection) => Promise<IndexableType>;
  changeConnectionType: (connection: Connection, type: ConnectionType) => Promise<IndexableType>;
  clearConnections: () => Promise<void>;
}

export interface IWalletStorage {
  getWallet: (walletId: IndexableType) => Promise<WalletDS | undefined>;
  getWallets: (where?: Record<string, any>) => Promise<WalletDS[]>;
  addWallet: (wallet: Wallet) => Promise<IndexableType>;
  updateWallet: (wallet: Wallet) => Promise<IndexableType>;
  deleteWallet: (walletId: string) => Promise<void>;
}

export interface IAccountStorage {
  getAccount: (accountId: IndexableType) => Promise<AccountDS | undefined>;
  getAccounts: (where?: Record<string, any>) => Promise<AccountDS[]>;
  addAccount: <T extends Account>(account: T) => Promise<IndexableType>;
  updateAccount: <T extends Account>(account: T) => Promise<IndexableType>;
  deleteAccount: (accountId: AccountID) => Promise<void>;
}

export interface IContactStorage {
  getContact: (contactId: IndexableType) => Promise<Contact | undefined>;
  getContacts: (where?: Record<string, any>) => Promise<Contact[]>;
  addContact: (contact: Contact) => Promise<IndexableType>;
  updateContact: (contact: Contact) => Promise<IndexableType>;
  deleteContact: (contactId: IndexableType) => Promise<void>;
}

export interface IMultisigTransactionStorage {
  getMultisigTx: (txId: IndexableType) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: (where?: Record<string, any>) => Promise<MultisigTransactionDS[]>;
  addMultisigTx: (tx: MultisigTransaction) => Promise<IndexableType>;
  updateMultisigTx: (tx: MultisigTransactionDS) => Promise<IndexableType>;
  deleteMultisigTx: (txId: IndexableType) => Promise<void>;
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

type WithID = {
  id?: string | number;
};

export type ConnectionDS = WithID & Connection;

export type BalanceDS = Balance;
export type WalletDS = WithID & Wallet;
export type AccountDS = WithID & (Account | MultisigAccount);
export type ContactDS = WithID & Contact;
export type MultisigTransactionDS = WithID & MultisigTransaction;
