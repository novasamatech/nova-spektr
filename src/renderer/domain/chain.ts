import { Asset } from './asset';
import { ChainId, HexString } from './shared-kernel';

export type Chain = {
  chainId: ChainId;
  parentId?: HexString;
  name: string;
  assets: Asset[];
  nodes: RPCNode[];
  explorers: Explorer[];
  icon: string;
  addressPrefix: number;
  externalApi?: Record<ApiType, ExternalApi>;
  options?: ChainOptions[];
};

export type ChainOptions = 'testnet' | 'crowdloans';

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

export type ExternalApi = {
  type: HistoryType;
  url: string;
};

export type ApiType = 'history';
export type HistoryType = 'subquery';
