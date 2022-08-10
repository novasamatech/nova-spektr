import { IndexableType, PromiseExtended } from 'dexie';

import { HexString } from '@renderer/domain/types';

// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {}

export interface IBalanceStorage {
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string) => Balance | undefined;
  getBalances: (publicKey: HexString) => PromiseExtended<Balance[]>;
  updateBalance: (balance: Balance) => PromiseExtended<IndexableType>;
}

export interface IConnectionStorage {
  getConnection: (chainId: HexString) => PromiseExtended<Connection | undefined>;
  getConnections: () => PromiseExtended<Connection[]>;
  addConnection: (chainId: HexString, type: ConnectionType) => PromiseExtended<IndexableType>;
  addConnections: (connections: Connection[]) => PromiseExtended<IndexableType>;
  changeConnectionType: (connection: Connection, type: ConnectionType) => PromiseExtended<IndexableType>;
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
