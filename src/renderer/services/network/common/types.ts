import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { BN } from '@polkadot/util';

import { Chain, RpcNode } from '@renderer/domain/chain';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ChainID } from '@renderer/domain/shared-kernel';

// =====================================================
// ================ Service interface ==================
// =====================================================

export interface IChainService {
  getChainsData: () => Promise<Chain[]>;
  getChainById: (chainId: ChainID) => Promise<Chain | undefined>;
  getStakingChainsData: () => Promise<Chain[]>;
  sortChains: <T extends ChainLike>(chains: T[]) => T[];
  getExpectedBlockTime: (api: ApiPromise) => BN;
}

export interface IChainSpecService {
  getLightClientChains: () => ChainID[];
  getKnownChain: (chainId: ChainID) => string | undefined;
}

export interface INetworkService {
  connections: ConnectionsMap;
  setupConnections: () => Promise<void>;
  addRpcNode: (chainId: ChainID, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainID, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainID, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (genesisHash: ChainID, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (props: ConnectProps) => Promise<void>;
  connectWithAutoBalance: (chainId: ChainID, attempt: number) => Promise<void>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type ChainLike = Pick<Chain, 'name' | 'options'>;

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

export type ConnectionsMap = Record<ChainID, ExtendedChain>;

export type ConnectProps = {
  chainId: ChainID;
  type: ConnectionType;
  node?: RpcNode;
  attempt?: number;
  timeoutId?: any;
};
