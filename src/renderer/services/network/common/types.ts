import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';

import { Chain, RpcNode } from '@renderer/domain/chain';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';

// =====================================================
// ================ Service interface ==================
// =====================================================

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
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (genesisHash: HexString, rpcUrl: string) => Promise<boolean>;
  connectToNetwork: (
    chainId: ChainId,
    type: ConnectionType.RPC_NODE | ConnectionType.LIGHT_CLIENT,
    node?: RpcNode,
  ) => Promise<void>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type ExtendedChain = Chain & {
  connection: Connection;
  api?: ApiPromise;
  provider?: ProviderInterface;
  disconnect?: (switchNetwork: boolean) => Promise<void>;
};

export type ConnectionsMap = Record<ChainId, ExtendedChain>;
