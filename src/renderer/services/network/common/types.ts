import { ApiPromise } from '@polkadot/api';

import { Chain } from '@renderer/domain/chain';
import { Connection, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';

// ------------------
// Service interfaces
// ------------------
export interface IChainService {
  getChainsData: () => Promise<Chain[]>;
  sortChains: (chains: Chain[]) => Chain[];
}

export interface IChainSpecService {
  getChainSpec: (chainId: ChainId) => Promise<string | undefined>;
  getKnownChain: (chainId: ChainId) => string | undefined;
}

export interface INetworkService {
  connections: Record<string, ExtendedChain>;
  init: () => Promise<void>;
  reconnect: (chainId: ChainId) => Promise<void>;
  connectToNetwork: (chainId: ChainId, type: ConnectionType, nodeUrl?: string) => Promise<void>;
  updateConnectionType: (chainId: ChainId, type: ConnectionType) => Promise<void>;
  updateConnectionStatus: (chainId: ChainId, status: ConnectionStatus) => Promise<void>;
}

// ------------------
// ----- Types ------
// ------------------

export type ExtendedChain = Chain & {
  connection: Connection;
  api?: ApiPromise;
};
