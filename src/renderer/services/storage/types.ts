import { IndexableType } from 'dexie';

import { HexString } from '@renderer/domain/types';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {}

export interface IBalanceStorage {
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string) => Balance | undefined;
  getBalances: (publicKey: HexString) => Promise<Balance[]>;
  updateBalance: (balance: Balance) => Promise<IndexableType>;
}

export interface IConnectionStorage {
  getConnection: (chainId: HexString) => Promise<Connection | undefined>;
  getConnections: () => Promise<Connection[]>;
  addConnection: (chainId: HexString, type: ConnectionType) => Promise<IndexableType>;
  addConnections: (connections: Connection[]) => Promise<IndexableType>;
  changeConnectionType: (connection: Connection, type: ConnectionType) => Promise<IndexableType>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================
interface WithID {
  id?: string;
}

export const enum ConnectionType {
  LIGHT_CLIENT = 'LIGHT_CLIENT',
  RPC_NODE = 'RPC_NODE',
  DISABLED = 'DISABLED',
}

export interface Connection extends WithID {
  chainId: HexString;
  type: ConnectionType;
}

export interface Balance {
  chainId: HexString;
  publicKey: HexString;
  assetId: string;
  verified: boolean;
  free: string;
  reserved: string;
  frozen: string;
}
