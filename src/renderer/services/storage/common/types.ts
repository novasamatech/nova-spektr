import { IndexableType } from 'dexie';

import { Balance } from '@renderer/domain/balance';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { Contact } from '@renderer/domain/contact';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { Wallet } from '@renderer/domain/wallet';
import { Transaction } from '@renderer/domain/transaction';
import { Account } from '@renderer/domain/account';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {
  connectTo: <T extends keyof DataStorage>(name: T) => DataStorage[T] | undefined;
}

export interface IBalanceStorage {
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getNetworkBalances: (publicKeys: PublicKey[], chainId: ChainId) => Promise<BalanceDS[]>;
  getBalances: (publicKey: PublicKey) => Promise<BalanceDS[]>;
  updateBalance: (balance: Balance) => Promise<void>;
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
  addAccount: (wallet: Account) => Promise<IndexableType>;
  updateAccount: (wallet: Account) => Promise<IndexableType>;
  deleteAccount: (walletId: string) => Promise<void>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================

export type DataStorage = {
  balances: IBalanceStorage;
  connections: IConnectionStorage;
  wallets: IWalletStorage;
  accounts: IAccountStorage;
};

type WithID = {
  id?: string;
};

export type ConnectionDS = WithID & Connection;

export type BalanceDS = Balance;

export type WalletDS = WithID & Wallet;
export type AccountDS = WithID & Account;

export type ContactDS = WithID & Contact;
export type TransactionDS = WithID & Transaction;
