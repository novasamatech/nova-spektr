import { ApiPromise } from '@polkadot/api';

import { HexString } from '@renderer/domain/types';
import { Connection } from '../../storage';

// ------------------
// Service interfaces
// ------------------
export interface IChainService {
  getChainsData: () => Promise<Chain[]>;
  sortChains: (chains: Chain[]) => Chain[];
}

export interface IChainSpecService {
  getChainSpec: (chainId: HexString) => Promise<string | undefined>;
  getKnownChain: (chainId: HexString) => string | undefined;
}

export interface INetworkService {
  connections: Record<string, ExtendedChain>;
  init: () => Promise<void>;
  reconnect: (chainId: HexString) => Promise<void>;
  updateConnectionType: (chainId: HexString, connectionType: ConnectionType) => Promise<void>;
}

// ------------------
// ----- Types ------
// ------------------

export const enum ConnectionType {
  LIGHT_CLIENT = 'LIGHT_CLIENT',
  RPC_NODE = 'RPC_NODE',
  DISABLED = 'DISABLED',
}

export type StatemineExtras = {
  assetId: string;
};

export type OrmlExtras = {
  currencyIdScale: string;
  currencyIdType: string;
  existentialDeposit: string;
  transfersEnabled?: boolean;
};

export const enum AssetType {
  ORML = 'orml',
  STATEMINE = 'statemine',
}

export type Asset = {
  assetId: number;
  symbol: string;
  precision: number;
  priceId: string;
  icon: string;
  type?: AssetType;
  typeExtras?: StatemineExtras | OrmlExtras;
};

export type RPCNode = {
  url: string;
  name: string;
};

export type Explorer = {
  name: string;
  extrinsic?: string;
  account?: string;
  event?: string;
};

export type ApiType = 'history';
export type HistoryType = 'subquery';

export type ExternalApi = {
  type: HistoryType;
  url: string;
};

export type ChainOptions = 'testnet' | 'crowdloans'

export type Chain = {
  chainId: HexString;
  parentId?: HexString;
  name: string;
  assets: Asset[];
  nodes: RPCNode[];
  explorers: Explorer[];
  icon: string;
  addressPrefix: number;
  externalApi?: Record<ApiType, ExternalApi>;
  options: ChainOptions[];
};

export type ExtendedChain = Chain & {
  connection: Connection;
  api: ApiPromise;
};
