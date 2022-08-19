import { IndexableType } from 'dexie';

import { Balance } from '@renderer/domain/balance';
import { Contact } from '@renderer/domain/contact';
import { MultisigWallet, Wallet } from '@renderer/domain/wallet';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {
  connectTo: <T extends keyof DataStorage>(name: T) => DataStorage[T] | undefined;
}

export interface IBalanceStorage {
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getBalances: (publicKey: PublicKey) => Promise<BalanceDS[]>;
  updateBalance: (balance: Balance) => Promise<IndexableType>;
}

export interface IConnectionStorage {
  getConnection: (chainId: ChainId) => Promise<ConnectionDS | undefined>;
  getConnections: () => Promise<ConnectionDS[]>;
  addConnection: (chainId: ChainId, type: ConnectionType) => Promise<IndexableType>;
  addConnections: (connections: Connection[]) => Promise<IndexableType>;
  changeConnectionType: (connection: Connection, type: ConnectionType) => Promise<IndexableType>;
}

export interface IWalletStorage {
  getWallet: (walletId: IndexableType) => Promise<WalletDS | undefined>;
  getWallets: (where?: Record<string, any>) => Promise<WalletDS[]>;
  addWallet: (wallet: Wallet) => Promise<IndexableType>;
  updateWallet: (wallet: Wallet) => Promise<IndexableType>;
  deleteWallet: (walletId: string) => Promise<void>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================

export type DataStorage = {
  balances: IBalanceStorage;
  connections: IConnectionStorage;
  wallets: IWalletStorage;
};

type WithID = {
  id?: string;
};

export type ConnectionDS = WithID & Connection;

export type BalanceDS = WithID & Balance;

export type WalletDS = WithID & Wallet;
export type MultisigWalletDS = Wallet & MultisigWallet;

export type ContactDS = WithID & Contact;
