import { ApiPromise } from '@polkadot/api';

import { Chain } from '@renderer/domain/chain';
import { Connection, ConnectionNode, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';

// ------------------
// Service interfaces
// ------------------
export interface IChainService {
  getChainsData: () => Promise<Chain[]>;
  sortChains: <T extends Chain = Chain>(chains: T[]) => T[];
}

export interface IChainSpecService {
  getChainSpec: (chainId: ChainId) => Promise<string | undefined>;
  getKnownChain: (chainId: ChainId) => string | undefined;
}

export interface INetworkService {
  connections: Record<string, ExtendedChain>;
  setupConnections: () => Promise<void>;
  reconnect: (chainId: ChainId) => Promise<void>;
  connectToNetwork: (chainId: ChainId, type: ConnectionType, node?: ConnectionNode) => Promise<void>;
}

// ------------------
// ----- Types ------
// ------------------

export type ExtendedChain = Chain & {
  connection: Connection;
  api?: ApiPromise;
};

export type ConnectionsMap = Record<ChainId, ExtendedChain>;
