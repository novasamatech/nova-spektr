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
  getLightClientChains: () => ChainId[];
  getKnownChain: (chainId: ChainId) => string | undefined;
}

export interface INetworkService {
  connections: Record<string, ExtendedChain>;
  setupConnections: () => Promise<void>;
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainId, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (genesisHash: HexString, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (chainId: ChainId, type: ConnectionType, node?: RpcNode) => Promise<void>;
  connectWithAutoBalance: (chainId: ChainId, attempt: number) => Promise<void>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export const enum RpcValidation {
  'INVALID',
  'VALID',
  'WRONG_NETWORK',
}

export type ExtendedChain = Chain & {
  connection: Connection;
  api?: ApiPromise;
  provider?: ProviderInterface;
  disconnect?: (switchNetwork: boolean) => Promise<void>;
};

export type ConnectionsMap = Record<ChainId, ExtendedChain>;
