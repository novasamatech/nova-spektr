import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';

import { Chain } from '@renderer/domain/chain';
import { Connection, RpcNode, ConnectionType } from '@renderer/domain/connection';
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
  connectToNetwork: (chainId: ChainId, type: ConnectionType, node?: RpcNode) => Promise<void>;
}

// ------------------
// ----- Types ------
// ------------------

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export type ExtendedChain = Chain & {
  connection: Connection;
  api?: ApiPromise;
  provider?: ProviderInterface;
  status: ConnectionStatus;
};

export type ConnectionsMap = Record<ChainId, ExtendedChain>;
